import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for scrolling a container by a specific number of pixels
 */
export class ScrollByTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "scroll_by",
      description: "Scroll a container (or page) by a specific number of pixels. Essential for: testing sticky headers/footers, triggering infinite scroll, precise scroll position testing, scroll-triggered animations. Use 'html' or 'body' selector for page scrolling. Positive pixels = down/right, negative = up/left.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of scrollable container (use 'html' or 'body' for page scroll, e.g., 'testid:chat-container', '.scrollable-list', 'html')"
          },
          pixels: {
            type: "number",
            description: "Number of pixels to scroll. Positive scrolls down/right, negative scrolls up/left. Example: 500, -200"
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
        if (Math.abs(scrollResult.actualScrolled) < Math.abs(pixels)) {
          const boundary = pixels > 0 ? 'bottom' : 'top';
          messages.push(`⚠️  Reached ${boundary} of page (max scroll: ${scrollResult.maxScroll}px)`);
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

        // Select preferred element if multiple matches
        const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator);

        // Scroll the element
        const scrollResult = await element.evaluate((el, scrollAmount) => {
          const previousScroll = el.scrollTop;
          el.scrollTop += scrollAmount;
          const newScroll = el.scrollTop;
          const actualScrolled = newScroll - previousScroll;

          return {
            previous: previousScroll,
            new: newScroll,
            actualScrolled,
            maxScroll: el.scrollHeight - el.clientHeight,
            tagName: el.tagName.toLowerCase(),
            testId: el.getAttribute('data-testid'),
            id: el.id,
            className: el.className
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

        const direction = pixels > 0 ? 'down' : 'up';
        const messages = [
          `✓ Scrolled ${elementDesc} ${direction} ${Math.abs(pixels)}px`,
          `Position: y=${scrollResult.new}px (was ${scrollResult.previous}px)`
        ];

        // Add info if we hit the scroll boundary
        if (Math.abs(scrollResult.actualScrolled) < Math.abs(pixels)) {
          const boundary = pixels > 0 ? 'bottom' : 'top';
          messages.push(`⚠️  Reached ${boundary} of container (max scroll: ${scrollResult.maxScroll}px)`);
        }

        // Add selection warning if multiple elements matched
        const warning = this.formatElementSelectionInfo(args.selector, elementIndex, totalCount);
        if (warning) {
          messages.push('', warning);
        }

        return createSuccessResponse(messages);
      }
    });
  }
}
