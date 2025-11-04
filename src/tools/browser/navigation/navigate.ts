import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';

async function resetState() {
  const { resetBrowserState } = await import('../../../toolHandler.js');
  resetBrowserState();
}

async function getLogsSinceLastNav(): Promise<string[]> {
  const { getConsoleLogsSinceLastNavigation } = await import('../../../toolHandler.js');
  return getConsoleLogsSinceLastNavigation();
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
      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

      try {
        await page.goto(args.url, {
          timeout: args.timeout || 30000,
          waitUntil: args.waitUntil || "load"
        });

        // Detect common Next.js dev boot error and auto-reload up to N times
        // Example logs:
        //   "Uncaught SyntaxError: Invalid or unexpected token (at layout.js:62:29)"
        //   "main-app.js:... Download the React DevTools ..."
        //   "error-boundary-callbacks.js:83"
        try {
          const maxRetries = 2; // keep parameters minimal
          const delay = 800; // ms

          let attempts = 0;
          // Give the console a brief moment to emit init errors
          if (delay) await sleep(delay);

          while (attempts <= maxRetries) {
            const logs = await getLogsSinceLastNav();
            const hasInvalidToken = logs.some(l => l.toLowerCase().includes('invalid or unexpected token'));
            const hasNextMarkers = logs.some(l =>
              l.includes('main-app.js') ||
              l.includes('error-boundary-callbacks.js') ||
              l.toLowerCase().includes('download the react devtools')
            );

            if (hasInvalidToken && hasNextMarkers && attempts < maxRetries) {
              attempts++;
              this.recordNavigation();
              await page.reload({ timeout: args.timeout || 30000, waitUntil: args.waitUntil || 'load' });
              if (delay) await sleep(delay);
              continue;
            }

            // Either no error pattern or we exhausted retries
            if (attempts > 0 && hasInvalidToken && hasNextMarkers) {
              return createSuccessResponse(`Navigated to ${args.url} (attempted ${attempts} auto-reload(s); init error persisted)`);
            }
            if (attempts > 0) {
              return createSuccessResponse(`Navigated to ${args.url} (auto-reloaded ${attempts} time(s) after detecting Next.js init error)`);
            }
            // No error detected on first attempt
            break;
          }
        } catch {
          // Best-effort detection; ignore and proceed
        }

        // Try a quick, non-blocking network-idle check. If the page is already
        // idle, include a compact confirmation line. Keep parameters minimal and
        // avoid hanging SPAs: use a very small timeout and ignore failures.
        const messages: string[] = [`Navigated to ${args.url}`];
        try {
          const idleStart = Date.now();
          const waitForLoadState = (page as any).waitForLoadState?.bind(page);
          if (waitForLoadState) {
            await waitForLoadState('networkidle', { timeout: 500 });
            const duration = Date.now() - idleStart;
            messages.push(`\u2713 Network idle after ${duration}ms, 0 pending requests`);
          }
        } catch {
          // Best-effort quick check; ignore timeout or errors and return immediately
        }

        return createSuccessResponse(messages);
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
