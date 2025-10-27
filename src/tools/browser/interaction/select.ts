import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for selecting options from dropdown menus
 */
export class SelectTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "select",
      description: "Select an element on the page with Select tag",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for element to select" },
          value: { type: "string", description: "Value to select" },
        },
        required: ["selector", "value"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const normalizedSelector = this.normalizeSelector(args.selector);

      // Use standard element selection with error on multiple matches
      const locator = page.locator(normalizedSelector);
      const { element } = await this.selectPreferredLocator(locator, {
        errorOnMultiple: true,
        originalSelector: args.selector,
      });

      await element.selectOption(args.value);
      return createSuccessResponse(`Selected ${args.selector} with: ${args.value}`);
    });
  }
}
