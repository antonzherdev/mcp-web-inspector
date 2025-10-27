import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';

async function resetState() {
  const { resetBrowserState } = await import('../../../toolHandler.js');
  resetBrowserState();
}

/**
 * Tool for navigating to URLs
 */
export class NavigateTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    const sessionEnabled = sessionConfig?.saveSession ?? true;
    const userDataDir = sessionConfig?.userDataDir || './.mcp-web-inspector/user-data';
    const headlessDefault = sessionConfig?.headlessDefault ?? false;

    const description = sessionEnabled
      ? `Navigate to a URL. Browser sessions (cookies, localStorage, sessionStorage) are automatically saved in ${userDataDir} directory and persist across restarts. To clear saved sessions, delete the directory.`
      : "Navigate to a URL. Browser starts fresh each time with no persistent session state (started with --no-save-session flag).";

    return {
      name: "navigate",
      description,
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to navigate to the website specified" },
          browserType: {
            type: "string",
            description: "Browser type to use (chromium, firefox, webkit). Defaults to chromium",
            enum: ["chromium", "firefox", "webkit"]
          },
          device: {
            type: "string",
            description: "Device preset to emulate. Uses device configurations for viewport, user agent, and device scale factor. When specified, overrides width/height parameters. Mobile: iphone-se, iphone-14, iphone-14-pro, pixel-5, ipad, samsung-s21. Desktop: desktop-1080p (1920x1080), desktop-2k (2560x1440), laptop-hd (1366x768).",
            enum: ["iphone-se", "iphone-14", "iphone-14-pro", "pixel-5", "ipad", "samsung-s21", "desktop-1080p", "desktop-2k", "laptop-hd"]
          },
          width: { type: "number", description: "Viewport width in pixels. If not specified, automatically matches screen width. Ignored if device is specified." },
          height: { type: "number", description: "Viewport height in pixels. If not specified, automatically matches screen height. Ignored if device is specified." },
          timeout: { type: "number", description: "Navigation timeout in milliseconds" },
          waitUntil: { type: "string", description: "Navigation wait condition" },
          headless: { type: "boolean", description: `Run browser in headless mode (default: ${headlessDefault ? 'true - no window shown' : 'false - browser window visible'})` }
        },
        required: ["url"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    // Check if browser is available
    if (!context.browser || !context.browser.isConnected()) {
      // If browser is not connected, we need to reset the state to force recreation
      await resetState();
      return createErrorResponse(
        "Browser is not connected. The connection has been reset - please retry your navigation."
      );
    }

    // Check if page is available and not closed
    if (!context.page || context.page.isClosed()) {
      return createErrorResponse(
        "Page is not available or has been closed. Please retry your navigation."
      );
    }

    this.recordNavigation();
    return this.safeExecute(context, async (page) => {
      try {
        await page.goto(args.url, {
          timeout: args.timeout || 30000,
          waitUntil: args.waitUntil || "load"
        });

        return createSuccessResponse(`Navigated to ${args.url}`);
      } catch (error) {
        const errorMessage = (error as Error).message;

        // Check for common disconnection errors
        if (
          errorMessage.includes("Target page, context or browser has been closed") ||
          errorMessage.includes("Target closed") ||
          errorMessage.includes("Browser has been disconnected")
        ) {
          // Reset browser state to force recreation on next attempt
          await resetState();
          return createErrorResponse(
            `Browser connection issue: ${errorMessage}. Connection has been reset - please retry your navigation.`
          );
        }

        // For other errors, return the standard error
        throw error;
      }
    });
  }
}
