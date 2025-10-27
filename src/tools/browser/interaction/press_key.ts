import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for pressing keyboard keys
 */
export class PressKeyTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "press_key",
      description: "Press a keyboard key",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "Key to press (e.g. 'Enter', 'ArrowDown', 'a')" },
          selector: { type: "string", description: "Optional CSS selector to focus before pressing key" }
        },
        required: ["key"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      if (args.selector) {
        const normalizedSelector = this.normalizeSelector(args.selector);

        // Use standard element selection with error on multiple matches
        const locator = page.locator(normalizedSelector);
        const { element } = await this.selectPreferredLocator(locator, {
          errorOnMultiple: true,
          originalSelector: args.selector,
        });

        await element.focus();
      }

      await page.keyboard.press(args.key);
      return createSuccessResponse(`Pressed key: ${args.key}`);
    });
  }
}
