import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for hovering over elements
 */
export class HoverTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "hover",
      description: "Hover an element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for element to hover" },
        },
        required: ["selector"],
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

      await element.hover();
      return createSuccessResponse(`Hovered ${args.selector}`);
    });
  }
}
