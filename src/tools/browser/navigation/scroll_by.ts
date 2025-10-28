import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for scrolling a container by a specific number of pixels
 */
export class ScrollByTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "scroll_by",
      description: "Scroll a container (or page) by a specific number of pixels. Auto-detects scroll direction when only one is available. Essential for: testing sticky headers/footers, triggering infinite scroll, carousel navigation, precise scroll position testing. Use 'html' or 'body' for page scrolling. Positive pixels = down/right, negative = up/left. Outputs: ✓ success summary with axis position and percent of max scroll; ⚠️ boundary notice when movement is limited; ⚠️ ambiguous-direction guidance when both axes scroll; ⚠️ not-scrollable report with ancestor suggestions; 💡 follow-up tips matching the detected scenario.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of scrollable container (use 'html' or 'body' for page scroll, e.g., 'testid:chat-container', '.scrollable-list', 'html')"
          },
          pixels: {
            type: "number",
            description: "Number of pixels to scroll. Positive = down/right, negative = up/left. Example: 500, -200"
          },
          direction: {
            type: "string",
            description: "Scroll direction: 'vertical' (default), 'horizontal', or 'auto' (detects available direction). Use 'auto' for smart detection.",
            enum: ["vertical", "horizontal", "auto"]
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
      const direction = args.direction || 'vertical'; // Default to vertical for backward compatibility

      // Check if scrolling the page (html/body) or a specific element
      const isPageScroll = selector === 'html' || selector === 'body';

      if (isPageScroll) {
        // Scroll the page
        const scrollResult = await page.evaluate(({ scrollAmount, scrollDirection }) => {
          const maxVertical = document.documentElement.scrollHeight - window.innerHeight;
          const maxHorizontal = document.documentElement.scrollWidth - window.innerWidth;

          // Auto-detect direction if needed
          let actualDirection = scrollDirection;
          if (scrollDirection === 'auto') {
            const verticalScrollable = maxVertical > 0;
            const horizontalScrollable = maxHorizontal > 0;

            if (verticalScrollable && !horizontalScrollable) {
              actualDirection = 'vertical';
            } else if (horizontalScrollable && !verticalScrollable) {
              actualDirection = 'horizontal';
            } else if (verticalScrollable && horizontalScrollable) {
              // Both directions scrollable - need explicit direction
              return {
                error: 'ambiguous',
                maxVertical,
                maxHorizontal
              };
            } else {
              // Neither direction scrollable
              return {
                error: 'not-scrollable',
                maxVertical: 0,
                maxHorizontal: 0
              };
            }
          }

          // Perform the scroll
          const isVertical = actualDirection === 'vertical';
          const previousScroll = isVertical ? window.scrollY : window.scrollX;

          if (isVertical) {
            window.scrollBy(0, scrollAmount);
          } else {
            window.scrollBy(scrollAmount, 0);
          }

          const newScroll = isVertical ? window.scrollY : window.scrollX;
          const actualScrolled = newScroll - previousScroll;

          return {
            previous: previousScroll,
            new: newScroll,
            actualScrolled,
            maxScroll: isVertical ? maxVertical : maxHorizontal,
            direction: actualDirection,
            maxVertical,
            maxHorizontal
          };
        }, { scrollAmount: pixels, scrollDirection: direction });

        // Handle error cases
        if ('error' in scrollResult) {
          if (scrollResult.error === 'ambiguous') {
            return createSuccessResponse([
              `⚠️  Page is scrollable in both directions`,
              `Vertical: ${scrollResult.maxVertical}px max scroll`,
              `Horizontal: ${scrollResult.maxHorizontal}px max scroll`,
              ``,
              `💡 Specify direction explicitly:`,
              `   scroll_by({ selector: "html", pixels: ${pixels}, direction: "vertical" })`,
              `   scroll_by({ selector: "html", pixels: ${pixels}, direction: "horizontal" })`
            ]);
          } else if (scrollResult.error === 'not-scrollable') {
            return createSuccessResponse([
              `⚠️  Page is not scrollable in any direction`,
              `Content fits within viewport (no overflow)`,
              `Position: unchanged`
            ]);
          }
        }

        const isVertical = scrollResult.direction === 'vertical';
        const directionWord = isVertical
          ? (pixels > 0 ? 'down' : 'up')
          : (pixels > 0 ? 'right' : 'left');
        const axis = isVertical ? 'y' : 'x';

        const messages = [
          `✓ Scrolled page ${directionWord} ${Math.abs(pixels)}px (${scrollResult.direction})`,
          `Position: ${axis}=${scrollResult.new}px (was ${scrollResult.previous}px)`
        ];

        // Add info if we hit the scroll boundary
        const hitBoundary = Math.abs(scrollResult.actualScrolled) < Math.abs(pixels);
        if (hitBoundary) {
          const boundary = pixels > 0 ? (isVertical ? 'bottom' : 'right') : (isVertical ? 'top' : 'left');
          messages.push(`⚠️  Reached ${boundary} of page (max scroll: ${scrollResult.maxScroll}px)`);
        }

        // Contextual suggestions
        if (isVertical && pixels > 0 && !hitBoundary) {
          // Scrolling down on page - suggest sticky header testing
          messages.push('');
          messages.push('💡 Common next step - Test sticky header/footer:');
          messages.push('   measure_element({ selector: "header" }) - Check if position stays fixed');
        } else if (hitBoundary && pixels > 0) {
          // Hit boundary - suggest checking for infinite scroll or lazy-loaded content
          messages.push('');
          messages.push('💡 At page boundary - Check for dynamic content:');
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
        const scrollResult = await element.evaluate(
          (el, { scrollAmount, scrollDirection }) => {
            const maxVertical = el.scrollHeight - el.clientHeight;
            const maxHorizontal = el.scrollWidth - el.clientWidth;

            const getClassName = (element: Element) => {
              const value = (element as any).className as unknown;
              if (typeof value === 'string') {
                return value;
              }
              if (
                value &&
                typeof (value as { baseVal?: unknown }).baseVal === 'string'
              ) {
                return (value as { baseVal: string }).baseVal;
              }
              return '';
            };

            // Auto-detect direction if needed
            let actualDirection = scrollDirection;
            if (scrollDirection === 'auto') {
              const verticalScrollable = maxVertical > 0;
              const horizontalScrollable = maxHorizontal > 0;

              if (verticalScrollable && !horizontalScrollable) {
                actualDirection = 'vertical';
              } else if (horizontalScrollable && !verticalScrollable) {
                actualDirection = 'horizontal';
              } else if (verticalScrollable && horizontalScrollable) {
                // Both directions scrollable - need explicit direction
                return {
                  error: 'ambiguous',
                  maxVertical,
                  maxHorizontal,
                  tagName: el.tagName ? el.tagName.toLowerCase() : 'element',
                  testId: el.getAttribute('data-testid'),
                  id: (el as any).id ?? null,
                  className: getClassName(el)
                };
              } else {
                // Neither direction scrollable - collect ancestors
                const scrollableAncestors: Array<{
                  tagName: string;
                  testId: string | null;
                  id: string | null;
                  className: string;
                  maxScrollVertical: number;
                  maxScrollHorizontal: number;
                }> = [];

                let parent = el.parentElement;
                while (parent && scrollableAncestors.length < 3) {
                  const maxParentVertical =
                    parent.scrollHeight - parent.clientHeight;
                  const maxParentHorizontal =
                    parent.scrollWidth - parent.clientWidth;
                  if (maxParentVertical > 0 || maxParentHorizontal > 0) {
                    scrollableAncestors.push({
                      tagName: parent.tagName
                        ? parent.tagName.toLowerCase()
                        : 'element',
                      testId: parent.getAttribute('data-testid'),
                      id: (parent as any).id ?? null,
                      className: getClassName(parent),
                      maxScrollVertical: maxParentVertical,
                      maxScrollHorizontal: maxParentHorizontal
                    });
                  }
                  parent = parent.parentElement;
                }

                return {
                  error: 'not-scrollable',
                  maxVertical: 0,
                  maxHorizontal: 0,
                  tagName: el.tagName ? el.tagName.toLowerCase() : 'element',
                  testId: el.getAttribute('data-testid'),
                  id: (el as any).id ?? null,
                  className: getClassName(el),
                  scrollableAncestors
                };
              }
            }

            // Perform the scroll
            const isVertical = actualDirection === 'vertical';
            const previousScroll = isVertical ? el.scrollTop : el.scrollLeft;

            if (isVertical) {
              el.scrollTop += scrollAmount;
            } else {
              el.scrollLeft += scrollAmount;
            }

            const newScroll = isVertical ? el.scrollTop : el.scrollLeft;
            const actualScrolled = newScroll - previousScroll;

            // Find scrollable ancestors (up to 3)
            const scrollableAncestors: Array<{
              tagName: string;
              testId: string | null;
              id: string | null;
              className: string;
              maxScrollVertical: number;
              maxScrollHorizontal: number;
            }> = [];

            let parent = el.parentElement;
            while (parent && scrollableAncestors.length < 3) {
              const maxParentVertical =
                parent.scrollHeight - parent.clientHeight;
              const maxParentHorizontal =
                parent.scrollWidth - parent.clientWidth;
              if (maxParentVertical > 0 || maxParentHorizontal > 0) {
                scrollableAncestors.push({
                  tagName: parent.tagName
                    ? parent.tagName.toLowerCase()
                    : 'element',
                  testId: parent.getAttribute('data-testid'),
                  id: (parent as any).id ?? null,
                  className: getClassName(parent),
                  maxScrollVertical: maxParentVertical,
                  maxScrollHorizontal: maxParentHorizontal
                });
              }
              parent = parent.parentElement;
            }

            return {
              previous: previousScroll,
              new: newScroll,
              actualScrolled,
              maxScroll: isVertical ? maxVertical : maxHorizontal,
              direction: actualDirection,
              maxVertical,
              maxHorizontal,
              tagName: el.tagName ? el.tagName.toLowerCase() : 'element',
              testId: el.getAttribute('data-testid'),
              id: (el as any).id ?? null,
              className: getClassName(el),
              scrollableAncestors
            };
          },
          { scrollAmount: pixels, scrollDirection: direction }
        );

        // Build element description
        let elementDesc = `<${scrollResult.tagName}`;
        if (scrollResult.testId) elementDesc += ` data-testid="${scrollResult.testId}"`;
        else if (scrollResult.id) elementDesc += ` id="${scrollResult.id}"`;
        else if (scrollResult.className) {
          const classes = scrollResult.className.split(' ').slice(0, 2).join(' ');
          if (classes) elementDesc += ` class="${classes}"`;
        }
        elementDesc += '>';

        // Handle error cases
        if ('error' in scrollResult) {
          if (scrollResult.error === 'ambiguous') {
            return createSuccessResponse([
              `⚠️  ${elementDesc} is scrollable in both directions`,
              `Vertical: ${scrollResult.maxVertical}px max scroll`,
              `Horizontal: ${scrollResult.maxHorizontal}px max scroll`,
              ``,
              `💡 Specify direction explicitly:`,
              `   scroll_by({ selector: "${args.selector}", pixels: ${pixels}, direction: "vertical" })`,
              `   scroll_by({ selector: "${args.selector}", pixels: ${pixels}, direction: "horizontal" })`
            ]);
          } else if (scrollResult.error === 'not-scrollable') {
            const messages = [
              `⚠️  Container is not scrollable in any direction`,
              `${elementDesc} has max scroll: 0px vertical, 0px horizontal`,
              `Position: unchanged`
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

                const directions = [];
                if (ancestor.maxScrollVertical > 0) directions.push(`↕️ ${ancestor.maxScrollVertical}px vertical`);
                if (ancestor.maxScrollHorizontal > 0) directions.push(`↔️ ${ancestor.maxScrollHorizontal}px horizontal`);

                messages.push(`   ${i + 1}. ${suggestion} (${directions.join(', ')})`);
              });
            } else {
              messages.push('');
              messages.push('💡 Suggestions:');
              messages.push(`   • Use 'html' or 'body' to scroll the page`);
              messages.push(`   • Use inspect_dom() to find scrollable containers`);
            }

            return createSuccessResponse(messages);
          }
        }

        // Calculate percentage of max scroll
        const percentage = scrollResult.maxScroll > 0
          ? Math.round((scrollResult.new / scrollResult.maxScroll) * 100)
          : 0;

        const isVertical = scrollResult.direction === 'vertical';
        const directionWord = isVertical
          ? (pixels > 0 ? 'down' : 'up')
          : (pixels > 0 ? 'right' : 'left');
        const axis = isVertical ? 'y' : 'x';

        const messages = [
          `✓ Scrolled ${elementDesc} ${directionWord} ${Math.abs(pixels)}px (${scrollResult.direction})`,
          `Position: ${axis}=${scrollResult.new}px (was ${scrollResult.previous}px) [${percentage}% of max: ${scrollResult.maxScroll}px]`
        ];

        // Add info if we hit the scroll boundary
        const hitBoundary = Math.abs(scrollResult.actualScrolled) < Math.abs(pixels);
        if (hitBoundary) {
          const boundary = pixels > 0 ? (isVertical ? 'bottom' : 'right') : (isVertical ? 'top' : 'left');
          messages.push(`⚠️  Reached ${boundary} of container`);

          // Suggest checking for lazy-loaded content at container boundary
          if (pixels > 0) {
            messages.push('');
            messages.push('💡 At container boundary - Check for lazy-loaded content:');
            messages.push(`   inspect_dom({ selector: "${args.selector}" }) - See if new children appeared`);
          }
        }

        return createSuccessResponse(messages);
      }
    });
  }
}
