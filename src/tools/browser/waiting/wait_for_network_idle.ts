import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig } from '../../common/types.js';

export interface WaitForNetworkIdleArgs {
  timeout?: number;
}

export class WaitForNetworkIdleTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "wait_for_network_idle",
      description: "Wait for network activity to settle. Waits until there are no network connections for at least 500ms. Better than fixed delays when waiting for AJAX calls or dynamic content loading. Returns actual wait duration and confirmation of idle state.",
      inputSchema: {
        type: "object",
        properties: {
          timeout: {
            type: "number",
            description: "Maximum time to wait in milliseconds (default: 10000)"
          }
        },
        required: [],
      },
    };
  }

  async execute(args: WaitForNetworkIdleArgs, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const { timeout = 10000 } = args;

      const startTime = Date.now();

      try {
        // Wait for network to be idle (no network connections for at least 500ms)
        await page.waitForLoadState('networkidle', { timeout });

        const duration = Date.now() - startTime;

        return {
          content: [{
            type: 'text',
            text: `✓ Network idle after ${duration}ms, 0 pending requests`
          }],
          isError: false,
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{
            type: 'text',
            text: `✗ Timeout after ${duration}ms waiting for network idle\nError: ${errorMessage}`
          }],
          isError: true,
        };
      }
    });
  }
}
