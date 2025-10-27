import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for navigating back in browser history
 */
export class GoBackTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "go_back",
      description: "Navigate back in browser history",
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
      await page.goBack();
      return createSuccessResponse("Navigated back in browser history");
    });
  }
}
