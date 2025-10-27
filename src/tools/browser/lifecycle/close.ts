import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

async function resetState() {
  const { resetBrowserState } = await import('../../../toolHandler.js');
  resetBrowserState();
}

/**
 * Tool for closing the browser
 */
export class CloseTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "close",
      description: "Close the browser and release all resources",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    if (context.browser) {
      try {
        // Check if browser is still connected
        if (context.browser.isConnected()) {
          await context.browser.close().catch(error => {
            console.error("Error while closing browser:", error);
          });
        } else {
          console.error("Browser already disconnected, cleaning up state");
        }
      } catch (error) {
        console.error("Error during browser close operation:", error);
        // Continue with resetting state even if close fails
      } finally {
        // Always reset the global browser and page references
        await resetState();
      }

      return createSuccessResponse("Browser closed successfully");
    }

    return createSuccessResponse("No browser instance to close");
  }
}
