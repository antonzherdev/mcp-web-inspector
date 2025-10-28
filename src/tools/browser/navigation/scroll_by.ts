import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for scrolling a container by a specific number of pixels
 */
export class ScrollByTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "scroll_by",
      description: "Scroll a container (or page) vertically by a specific number of pixels. Essential for: testing sticky headers/footers, triggering infinite scroll, precise scroll position testing, scroll-triggered animations. Use 'html' or 'body' selector for page scrolling. Positive pixels = scroll down, negative = scroll up. Reports scroll position as percentage of max scroll height.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of scrollable container (use 'html' or 'body' for page scroll, e.g., 'testid:chat-container', '.scrollable-list', 'html')"
          },
          pixels: {
            type: "number",
            description: "Number of pixels to scroll vertically. Positive scrolls down, negative scrolls up. Example: 500, -200"
          }
        },
        required: ["selector", "pixels"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      const pixels = args.pixels;

      // Check if scrolling the page (html/body) or a specific element
      const isPageScroll = selector === 'html' || selector === 'body';

      if (isPageScroll) {
        // Scroll the page
        const scrollResult = await page.evaluate((scrollAmount) => {
          const previousScroll = window.scrollY;
          window.scrollBy(0, scrollAmount);
          const newScroll = window.scrollY;
          const actualScrolled = newScroll - previousScroll;

          return {
            previous: previousScroll,
            new: newScroll,
            actualScrolled,
            maxScroll: document.documentElement.scrollHeight - window.innerHeight
          };
        }, pixels);

        const direction = pixels > 0 ? 'down' : 'up';
        const messages = [
          `✓ Scrolled page ${direction} ${Math.abs(pixels)}px`,
          `Position: y=${scrollResult.new}px (was ${scrollResult.previous}px)`
        ];

        // Add info if we hit the scroll boundary
        const hitBoundary = Math.abs(scrollResult.actualScrolled) < Math.abs(pixels);
        if (hitBoundary) {
          const boundary = pixels > 0 ? 'bottom' : 'top';
          messages.push(`⚠️  Reached ${boundary} of page (max scroll: ${scrollResult.maxScroll}px)`);
        }

        // Contextual suggestions
        if (pixels > 0 && !hitBoundary) {
          // Scrolling down on page - suggest sticky header testing
          messages.push('');
          messages.push('💡 Common next step - Test sticky header/footer:');
          messages.push('   measure_element({ selector: "header" }) - Check if position stays fixed');
        } else if (hitBoundary && pixels > 0) {
          // Hit bottom - suggest checking for infinite scroll or lazy-loaded content
          messages.push('');
          messages.push('💡 At page bottom - Check for dynamic content:');
          messages.push('   element_visibility({ selector: "..." }) - Verify lazy-loaded elements appeared');
          messages.push('   inspect_dom() - See if new content was added');
        }

        return createSuccessResponse(messages);
      } else {
        // Scroll a specific element
        const locator = page.locator(selector);

        // Check if element exists
        const count = await locator.count();
        if (count === 0) {
          return createSuccessResponse([
            `✗ Element not found: ${args.selector}`,
            ``,
            `💡 Try:`,
            `   • Use 'html' or 'body' to scroll the page`,
            `   • Use inspect_dom() to find scrollable containers`,
            `   • Use get_test_ids() to see available test IDs`
          ]);
        }

        // Use standard element selection with error on multiple matches
        const { element } = await this.selectPreferredLocator(locator, {
          errorOnMultiple: true,
          originalSelector: args.selector,
        });

        // Scroll the element and collect scrollable ancestor info
        const scrollResult = await element.evaluate((el, scrollAmount) => {
          const previousScroll = el.scrollTop;
          el.scrollTop += scrollAmount;
          const newScroll = el.scrollTop;
          const actualScrolled = newScroll - previousScroll;
          const maxScroll = el.scrollHeight - el.clientHeight;

          // Find scrollable ancestors (up to 3)
          const scrollableAncestors: Array<{
            tagName: string;
            testId: string | null;
            id: string;
            className: string;
            maxScroll: number;
          }> = [];

          let parent = el.parentElement;
          while (parent && scrollableAncestors.length < 3) {
            const maxParentScroll = parent.scrollHeight - parent.clientHeight;
            if (maxParentScroll > 0) {
              scrollableAncestors.push({
                tagName: parent.tagName.toLowerCase(),
                testId: parent.getAttribute('data-testid'),
                id: parent.id,
                className: parent.className,
                maxScroll: maxParentScroll
              });
            }
            parent = parent.parentElement;
          }

          return {
            previous: previousScroll,
            new: newScroll,
            actualScrolled,
            maxScroll,
            tagName: el.tagName.toLowerCase(),
            testId: el.getAttribute('data-testid'),
            id: el.id,
            className: el.className,
            scrollableAncestors
          };
        }, pixels);

        // Build element description
        let elementDesc = `<${scrollResult.tagName}`;
        if (scrollResult.testId) elementDesc += ` data-testid="${scrollResult.testId}"`;
        else if (scrollResult.id) elementDesc += ` id="${scrollResult.id}"`;
        else if (scrollResult.className) {
          const classes = scrollResult.className.split(' ').slice(0, 2).join(' ');
          if (classes) elementDesc += ` class="${classes}"`;
        }
        elementDesc += '>';

        // Check if container is not scrollable
        if (scrollResult.maxScroll === 0 && pixels !== 0) {
          const messages = [
            `⚠️  Container is not scrollable`,
            `${elementDesc} has max scroll: 0px (no overflow content)`,
            `Position: y=0px (unchanged)`
          ];

          // Suggest scrollable ancestors if found
          if (scrollResult.scrollableAncestors.length > 0) {
            messages.push('');
            messages.push('💡 Try these scrollable ancestors:');
            scrollResult.scrollableAncestors.forEach((ancestor, i) => {
              // Build selector suggestion (prefer testid > id > class)
              let suggestion = '';
              if (ancestor.testId) {
                suggestion = `testid:${ancestor.testId}`;
              } else if (ancestor.id) {
                suggestion = `#${ancestor.id}`;
              } else if (ancestor.className) {
                const firstClass = ancestor.className.split(' ')[0];
                suggestion = `.${firstClass}`;
              } else {
                suggestion = ancestor.tagName;
              }

              messages.push(`   ${i + 1}. ${suggestion} (${ancestor.maxScroll}px scrollable height)`);
            });
          } else {
            messages.push('');
            messages.push('💡 Suggestions:');
            messages.push(`   • Use 'html' or 'body' to scroll the page`);
            messages.push(`   • Use inspect_dom() to find scrollable containers`);
          }

          return createSuccessResponse(messages);
        }

        // Calculate percentage of max scroll
        const percentage = scrollResult.maxScroll > 0
          ? Math.round((scrollResult.new / scrollResult.maxScroll) * 100)
          : 0;

        const direction = pixels > 0 ? 'down' : 'up';
        const messages = [
          `✓ Scrolled ${elementDesc} ${direction} ${Math.abs(pixels)}px`,
          `Position: y=${scrollResult.new}px (was ${scrollResult.previous}px) [${percentage}% of max: ${scrollResult.maxScroll}px]`
        ];

        // Add info if we hit the scroll boundary
        const hitBoundary = Math.abs(scrollResult.actualScrolled) < Math.abs(pixels);
        if (hitBoundary) {
          const boundary = pixels > 0 ? 'bottom' : 'top';
          messages.push(`⚠️  Reached ${boundary} of container`);

          // Suggest checking for lazy-loaded content at container bottom
          if (pixels > 0) {
            messages.push('');
            messages.push('💡 At container bottom - Check for lazy-loaded content:');
            messages.push(`   inspect_dom({ selector: "${args.selector}" }) - See if new children appeared`);
          }
        }

        return createSuccessResponse(messages);
      }
    });
  }
}
