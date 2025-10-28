import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for scrolling an element into view
 */
export class ScrollToElementTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "scroll_to_element",
      description: "Scroll an element into view. Automatically handles scrolling within the nearest scrollable ancestor (page or scrollable container). Essential for: making elements visible before interaction, triggering lazy-loaded content, testing scroll behavior. Position: start (top of viewport), center (middle), end (bottom). Default: start.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or test ID (e.g., 'testid:submit-btn', '#login-button', 'text=Load More')"
          },
          position: {
            type: "string",
            description: "Where to align element in viewport: 'start' (top), 'center' (middle), 'end' (bottom). Default: 'start'",
            enum: ["start", "center", "end"]
          }
        },
        required: ["selector"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      const position = args.position || 'start';

      // Use Playwright's built-in scrollIntoViewIfNeeded which handles scrollable containers
      const locator = page.locator(selector);

      // First check if element exists
      const count = await locator.count();
      if (count === 0) {
        return createSuccessResponse([
          `✗ Element not found: ${args.selector}`,
          ``,
          `💡 Try:`,
          `   • Use get_test_ids() to see available test IDs`,
          `   • Use inspect_dom() to explore page structure`,
          `   • Use find_by_text({ text: "..." }) to locate by content`
        ]);
      }

      // Use standard element selection with error on multiple matches
      const { element } = await this.selectPreferredLocator(locator, {
        errorOnMultiple: true,
        originalSelector: args.selector,
      });

      // Scroll into view based on position
      if (position === 'center') {
        await element.evaluate((el) => {
          el.scrollIntoView({ block: 'center', inline: 'center' });
        });
      } else if (position === 'end') {
        await element.evaluate((el) => {
          el.scrollIntoView({ block: 'end', inline: 'end' });
        });
      } else {
        // 'start' or default
        await element.scrollIntoViewIfNeeded();
      }

      // Get element tag and attributes for output
      const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
      const testId = await element.getAttribute('data-testid');
      const id = await element.getAttribute('id');
      const className = await element.getAttribute('class');

      // Build element description
      let elementDesc = `<${tagName}`;
      if (testId) elementDesc += ` data-testid="${testId}"`;
      else if (id) elementDesc += ` id="${id}"`;
      else if (className) elementDesc += ` class="${className.split(' ').slice(0, 2).join(' ')}"`;
      elementDesc += '>';

      const messages = [
        `✓ Scrolled to element (position: ${position})`,
        elementDesc
      ];

      // Add contextual suggestion - verify element is now visible
      messages.push('');
      messages.push('💡 Common next step - Verify visibility:');
      messages.push(`   element_visibility({ selector: "${args.selector}" }) - Check if element is in viewport`);

      return createSuccessResponse(messages);
    });
  }
}
