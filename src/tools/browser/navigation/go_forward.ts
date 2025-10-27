import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for navigating forward in browser history
 */
export class GoForwardTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "go_forward",
      description: "Navigate forward in browser history",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordNavigation();
    return this.safeExecute(context, async (page) => {
      await page.goForward();
      return createSuccessResponse("Navigated forward in browser history");
    });
  }
}
