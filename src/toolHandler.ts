import type { Browser, Page } from 'playwright';
import { chromium, firefox, webkit, devices } from 'playwright';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BROWSER_TOOLS } from './tools.js';
import type { ToolContext } from './tools/common/types.js';
import {
  ScreenshotTool,
  NavigationTool,
  CloseBrowserTool,
  ConsoleLogsTool
} from './tools/browser/index.js';
import {
  ClickTool,
  FillTool,
  SelectTool,
  HoverTool,
  EvaluateTool,
  UploadFileTool
} from './tools/browser/interaction.js';
import {
  VisibleTextTool,
  VisibleHtmlTool
} from './tools/browser/visiblePage.js';
import { ElementVisibilityTool } from './tools/browser/elementVisibility.js';
import { ElementPositionTool } from './tools/browser/elementPosition.js';
import { InspectDomTool } from './tools/browser/inspectDom.js';
import { GetTestIdsTool } from './tools/browser/getTestIds.js';
import { QuerySelectorAllTool } from './tools/browser/querySelectorAll.js';
import { FindByTextTool } from './tools/browser/findByText.js';
import { GetComputedStylesTool } from './tools/browser/computedStyles.js';
import { MeasureElementTool } from './tools/browser/measureElement.js';
import { ElementExistsTool } from './tools/browser/elementExists.js';
import { ComparePositionsTool } from './tools/browser/comparePositions.js';
import { GoBackTool, GoForwardTool } from './tools/browser/navigation.js';
import { DragTool, PressKeyTool } from './tools/browser/interaction.js';
import { WaitForElementTool } from './tools/browser/waitForElement.js';
import { WaitForNetworkIdleTool } from './tools/browser/waitForNetworkIdle.js';
import { ListNetworkRequestsTool } from './tools/browser/listNetworkRequests.js';
import { GetRequestDetailsTool } from './tools/browser/getRequestDetails.js';

// Network request tracking
export interface NetworkRequest {
  index: number;
  method: string;
  url: string;
  resourceType: string;
  timestamp: number;
  status?: number;
  statusText?: string;
  timing?: number;
  requestData: {
    headers: Record<string, string>;
    postData: string | null;
  };
  responseData?: {
    headers: Record<string, string>;
    body: string | null;
  };
}

// Global state
let browser: Browser | undefined;
let page: Page | undefined;
let currentBrowserType: 'chromium' | 'firefox' | 'webkit' = 'chromium';
let networkLog: NetworkRequest[] = [];

// Session configuration
interface SessionConfig {
  saveSession: boolean;
  userDataDir: string;
  screenshotsDir: string;
}

let sessionConfig: SessionConfig = {
  saveSession: false,
  userDataDir: './.mcp-web-inspector/user-data',
  screenshotsDir: './.mcp-web-inspector/screenshots',
};

/**
 * Sets the session configuration
 */
export function setSessionConfig(config: Partial<SessionConfig>) {
  sessionConfig = { ...sessionConfig, ...config };
}

/**
 * Gets the screenshots directory
 */
export function getScreenshotsDir(): string {
  return sessionConfig.screenshotsDir;
}

/**
 * Resets browser and page variables
 * Used when browser is closed
 */
export function resetBrowserState() {
  browser = undefined;
  page = undefined;
  currentBrowserType = 'chromium';
  networkLog = [];
}

/**
 * Gets the network log
 */
export function getNetworkLog(): NetworkRequest[] {
  return networkLog;
}

/**
 * Clears the network log
 */
export function clearNetworkLog() {
  networkLog = [];
}
/**
 * Sets the provided page to the global page variable
 * @param newPage The Page object to set as the global page
 */
export function setGlobalPage(newPage: Page): void {
  page = newPage;
  page.bringToFront();// Bring the new tab to the front
  console.log("Global page has been updated.");
}
// Tool instances
let screenshotTool: ScreenshotTool;
let navigationTool: NavigationTool;
let closeBrowserTool: CloseBrowserTool;
let consoleLogsTool: ConsoleLogsTool;
let clickTool: ClickTool;
let fillTool: FillTool;
let selectTool: SelectTool;
let hoverTool: HoverTool;
let uploadFileTool: UploadFileTool;
let evaluateTool: EvaluateTool;
let visibleTextTool: VisibleTextTool;
let visibleHtmlTool: VisibleHtmlTool;
let goBackTool: GoBackTool;
let goForwardTool: GoForwardTool;
let dragTool: DragTool;
let pressKeyTool: PressKeyTool;
let elementVisibilityTool: ElementVisibilityTool;
let elementPositionTool: ElementPositionTool;
let inspectDomTool: InspectDomTool;
let getTestIdsTool: GetTestIdsTool;
let querySelectorAllTool: QuerySelectorAllTool;
let findByTextTool: FindByTextTool;
let getComputedStylesTool: GetComputedStylesTool;
let measureElementTool: MeasureElementTool;
let elementExistsTool: ElementExistsTool;
let comparePositionsTool: ComparePositionsTool;
let waitForElementTool: WaitForElementTool;
let waitForNetworkIdleTool: WaitForNetworkIdleTool;
let listNetworkRequestsTool: ListNetworkRequestsTool;
let getRequestDetailsTool: GetRequestDetailsTool;


interface BrowserSettings {
  viewport?: {
    width?: number;
    height?: number;
  };
  userAgent?: string;
  headless?: boolean;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  device?: string;
}

/**
 * Device preset mapping to Playwright device descriptors
 */
const DEVICE_PRESETS: Record<string, string> = {
  'iphone-se': 'iPhone SE',
  'iphone-14': 'iPhone 14',
  'iphone-14-pro': 'iPhone 14 Pro',
  'pixel-5': 'Pixel 5',
  'ipad': 'iPad (gen 7)',
  'samsung-s21': 'Galaxy S21'
};

/**
 * Register network event listeners
 */
async function registerNetworkListeners(page) {
  page.on('request', (request) => {
    networkLog.push({
      index: networkLog.length,
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
      timestamp: Date.now(),
      requestData: {
        headers: request.headers(),
        postData: request.postData() || null
      }
    });
  });

  page.on('response', async (response) => {
    // Find the matching request by URL and method (most recent match)
    const url = response.url();
    const method = response.request().method();

    for (let i = networkLog.length - 1; i >= 0; i--) {
      if (networkLog[i].url === url &&
          networkLog[i].method === method &&
          !networkLog[i].status) {

        networkLog[i].status = response.status();
        networkLog[i].statusText = response.statusText();
        networkLog[i].timing = Date.now() - networkLog[i].timestamp;

        // Try to capture response body (may fail for some resource types)
        let responseBody: string | null = null;
        try {
          responseBody = await response.text();
        } catch (e) {
          // Ignore errors (e.g., image/binary responses)
          responseBody = null;
        }

        networkLog[i].responseData = {
          headers: response.headers(),
          body: responseBody
        };

        break;
      }
    }
  });
}

async function registerConsoleMessage(page) {
  page.on("console", (msg) => {
    if (consoleLogsTool) {
      const type = msg.type();
      const text = msg.text();

      // "Unhandled Rejection In Promise" we injected
      if (text.startsWith("[Playwright]")) {
        const payload = text.replace("[Playwright]", "");
        consoleLogsTool.registerConsoleMessage("exception", payload);
      } else {
        consoleLogsTool.registerConsoleMessage(type, text);
      }
    }
  });

  // Uncaught exception
  page.on("pageerror", (error) => {
    if (consoleLogsTool) {
      const message = error.message;
      const stack = error.stack || "";
      const truncatedStack = stack
        ? '\n  ' + stack.split('\n').slice(0, 3).join('\n  ') + '\n  ...[truncated]'
        : '';
      consoleLogsTool.registerConsoleMessage("exception", `${message}${truncatedStack}`);
    }
  });

  // Unhandled rejection in promise
  await page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const message = typeof reason === "object" && reason !== null
          ? reason.message || JSON.stringify(reason)
          : String(reason);

      const stack = reason?.stack || "";
      const truncatedStack = stack
        ? '\n  ' + stack.split('\n').slice(0, 3).join('\n  ') + '\n  ...[truncated]'
        : '';
      // Use console.error get "Unhandled Rejection In Promise"
      console.error(`[Playwright][Unhandled Rejection In Promise] ${message}${truncatedStack}`);
    });
  });
}

/**
 * Ensures a browser is launched and returns the page
 */
export async function ensureBrowser(browserSettings?: BrowserSettings) {
  try {
    // Check if browser exists but is disconnected
    if (browser && !browser.isConnected()) {
      console.error("Browser exists but is disconnected. Cleaning up...");
      try {
        await browser.close().catch(err => console.error("Error closing disconnected browser:", err));
      } catch (e) {
        // Ignore errors when closing disconnected browser
      }
      // Reset browser and page references
      resetBrowserState();
    }

    // Launch new browser if needed
    if (!browser) {
      const { viewport, userAgent, headless = false, browserType = 'chromium', device } = browserSettings ?? {};

      // If browser type is changing, force a new browser instance
      if (browser && currentBrowserType !== browserType) {
        try {
          await browser.close().catch(err => console.error("Error closing browser on type change:", err));
        } catch (e) {
          // Ignore errors
        }
        resetBrowserState();
      }

      // Get device configuration if device preset is specified
      let deviceConfig = null;
      if (device && DEVICE_PRESETS[device]) {
        const playwrightDeviceName = DEVICE_PRESETS[device];
        deviceConfig = devices[playwrightDeviceName];
        if (deviceConfig) {
          console.error(`Using device preset: ${device} (${playwrightDeviceName})`);
        } else {
          console.error(`Warning: Device preset ${playwrightDeviceName} not found in Playwright devices`);
        }
      }

      console.error(`Launching new ${browserType} browser instance...`);

      // Use the appropriate browser engine
      let browserInstance;
      switch (browserType) {
        case 'firefox':
          browserInstance = firefox;
          break;
        case 'webkit':
          browserInstance = webkit;
          break;
        case 'chromium':
        default:
          browserInstance = chromium;
          break;
      }

      const executablePath = process.env.CHROME_EXECUTABLE_PATH;

      // Prepare context options
      const contextOptions: any = {
        headless,
        executablePath: executablePath,
      };

      // If device config exists, use it; otherwise use manual viewport/userAgent
      if (deviceConfig) {
        Object.assign(contextOptions, deviceConfig);
      } else {
        if (userAgent) {
          contextOptions.userAgent = userAgent;
        }
        contextOptions.viewport = {
          width: viewport?.width ?? 1280,
          height: viewport?.height ?? 720,
        };
        contextOptions.deviceScaleFactor = 1;
      }

      // Use persistent context if session saving is enabled
      if (sessionConfig.saveSession) {
        console.error(`Launching ${browserType} with persistent context at ${sessionConfig.userDataDir}...`);

        const context = await browserInstance.launchPersistentContext(sessionConfig.userDataDir, contextOptions);

        // Get the browser instance from the context
        browser = context.browser()!;
        currentBrowserType = browserType;

        // Add cleanup logic when browser is disconnected
        browser.on('disconnected', () => {
          console.error("Browser disconnected event triggered");
          browser = undefined;
          page = undefined;
        });

        // Get or create the first page
        const pages = context.pages();
        page = pages.length > 0 ? pages[0] : await context.newPage();
      } else {
        browser = await browserInstance.launch({
          headless,
          executablePath: executablePath
        });

        currentBrowserType = browserType;

        // Add cleanup logic when browser is disconnected
        browser.on('disconnected', () => {
          console.error("Browser disconnected event triggered");
          browser = undefined;
          page = undefined;
        });

        // Prepare new context options (without headless and executablePath which are for launch)
        const newContextOptions: any = {};
        if (deviceConfig) {
          Object.assign(newContextOptions, deviceConfig);
        } else {
          if (userAgent) {
            newContextOptions.userAgent = userAgent;
          }
          newContextOptions.viewport = {
            width: viewport?.width ?? 1280,
            height: viewport?.height ?? 720,
          };
          newContextOptions.deviceScaleFactor = 1;
        }

        const context = await browser.newContext(newContextOptions);

        page = await context.newPage();
      }

      // Register console message handler and network listeners
      await registerConsoleMessage(page);
      await registerNetworkListeners(page);
    }
    
    // Verify page is still valid
    if (!page || page.isClosed()) {
      console.error("Page is closed or invalid. Creating new page...");
      // Create a new page if the current one is invalid
      const context = browser.contexts()[0] || await browser.newContext();
      page = await context.newPage();
      
      // Re-register console message handler and network listeners
      await registerConsoleMessage(page);
      await registerNetworkListeners(page);
    }
    
    return page!;
  } catch (error) {
    console.error("Error ensuring browser:", error);
    // If something went wrong, clean up completely and retry once
    try {
      if (browser) {
        await browser.close().catch(() => {});
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
    
    resetBrowserState();
    
    // Try one more time from scratch
    const { viewport, userAgent, headless = false, browserType = 'chromium', device } = browserSettings ?? {};

    // Get device configuration if device preset is specified
    let deviceConfig = null;
    if (device && DEVICE_PRESETS[device]) {
      const playwrightDeviceName = DEVICE_PRESETS[device];
      deviceConfig = devices[playwrightDeviceName];
    }

    // Use the appropriate browser engine
    let browserInstance;
    switch (browserType) {
      case 'firefox':
        browserInstance = firefox;
        break;
      case 'webkit':
        browserInstance = webkit;
        break;
      case 'chromium':
      default:
        browserInstance = chromium;
        break;
    }

    const executablePath = process.env.CHROME_EXECUTABLE_PATH;

    // Prepare context options
    const retryContextOptions: any = {
      headless,
      executablePath: executablePath,
    };

    // If device config exists, use it; otherwise use manual viewport/userAgent
    if (deviceConfig) {
      Object.assign(retryContextOptions, deviceConfig);
    } else {
      if (userAgent) {
        retryContextOptions.userAgent = userAgent;
      }
      retryContextOptions.viewport = {
        width: viewport?.width ?? 1280,
        height: viewport?.height ?? 720,
      };
      retryContextOptions.deviceScaleFactor = 1;
    }

    // Use persistent context if session saving is enabled
    if (sessionConfig.saveSession) {
      console.error(`Launching ${browserType} with persistent context at ${sessionConfig.userDataDir} (retry)...`);

      const context = await browserInstance.launchPersistentContext(sessionConfig.userDataDir, retryContextOptions);

      browser = context.browser()!;
      currentBrowserType = browserType;

      browser.on('disconnected', () => {
        console.error("Browser disconnected event triggered (retry)");
        browser = undefined;
        page = undefined;
      });

      const pages = context.pages();
      page = pages.length > 0 ? pages[0] : await context.newPage();
    } else {
      browser = await browserInstance.launch({
        headless,
        executablePath: executablePath
      });
      currentBrowserType = browserType;

      browser.on('disconnected', () => {
        console.error("Browser disconnected event triggered (retry)");
        browser = undefined;
        page = undefined;
      });

      // Prepare new context options (without headless and executablePath which are for launch)
      const retryNewContextOptions: any = {};
      if (deviceConfig) {
        Object.assign(retryNewContextOptions, deviceConfig);
      } else {
        if (userAgent) {
          retryNewContextOptions.userAgent = userAgent;
        }
        retryNewContextOptions.viewport = {
          width: viewport?.width ?? 1280,
          height: viewport?.height ?? 720,
        };
        retryNewContextOptions.deviceScaleFactor = 1;
      }

      const context = await browser.newContext(retryNewContextOptions);

      page = await context.newPage();
    }

    await registerConsoleMessage(page);
    await registerNetworkListeners(page);

    return page!;
  }
}


/**
 * Initialize all tool instances
 */
function initializeTools(server: any) {
  // Browser tools
  if (!screenshotTool) screenshotTool = new ScreenshotTool(server);
  if (!navigationTool) navigationTool = new NavigationTool(server);
  if (!closeBrowserTool) closeBrowserTool = new CloseBrowserTool(server);
  if (!consoleLogsTool) consoleLogsTool = new ConsoleLogsTool(server);
  if (!clickTool) clickTool = new ClickTool(server);
  if (!fillTool) fillTool = new FillTool(server);
  if (!selectTool) selectTool = new SelectTool(server);
  if (!hoverTool) hoverTool = new HoverTool(server);
  if (!uploadFileTool) uploadFileTool = new UploadFileTool(server);
  if (!evaluateTool) evaluateTool = new EvaluateTool(server);
  if (!visibleTextTool) visibleTextTool = new VisibleTextTool(server);
  if (!visibleHtmlTool) visibleHtmlTool = new VisibleHtmlTool(server);
  if (!goBackTool) goBackTool = new GoBackTool(server);
  if (!goForwardTool) goForwardTool = new GoForwardTool(server);
  if (!dragTool) dragTool = new DragTool(server);
  if (!pressKeyTool) pressKeyTool = new PressKeyTool(server);
  if (!elementVisibilityTool) elementVisibilityTool = new ElementVisibilityTool(server);
  if (!elementPositionTool) elementPositionTool = new ElementPositionTool(server);
  if (!inspectDomTool) inspectDomTool = new InspectDomTool(server);
  if (!getTestIdsTool) getTestIdsTool = new GetTestIdsTool(server);
  if (!querySelectorAllTool) querySelectorAllTool = new QuerySelectorAllTool(server);
  if (!findByTextTool) findByTextTool = new FindByTextTool(server);
  if (!getComputedStylesTool) getComputedStylesTool = new GetComputedStylesTool(server);
  if (!measureElementTool) measureElementTool = new MeasureElementTool(server);
  if (!elementExistsTool) elementExistsTool = new ElementExistsTool(server);
  if (!comparePositionsTool) comparePositionsTool = new ComparePositionsTool(server);
  if (!waitForElementTool) waitForElementTool = new WaitForElementTool(server);
  if (!waitForNetworkIdleTool) waitForNetworkIdleTool = new WaitForNetworkIdleTool(server);
  if (!listNetworkRequestsTool) listNetworkRequestsTool = new ListNetworkRequestsTool(server);
  if (!getRequestDetailsTool) getRequestDetailsTool = new GetRequestDetailsTool(server);
}

/**
 * Main handler for tool calls
 */
export async function handleToolCall(
  name: string,
  args: any,
  server: any
): Promise<CallToolResult> {
  // Initialize tools
  initializeTools(server);

  try {

    // Special case for browser close to ensure it always works
    if (name === "close") {
      if (browser) {
        try {
          if (browser.isConnected()) {
            await browser.close().catch(e => console.error("Error closing browser:", e));
          }
        } catch (error) {
          console.error("Error during browser close in handler:", error);
        } finally {
          resetBrowserState();
        }
        return {
          content: [{
            type: "text",
            text: "Browser closed successfully",
          }],
          isError: false,
        };
      }
      return {
        content: [{
          type: "text",
          text: "No browser instance to close",
        }],
        isError: false,
      };
    }

    // Check if we have a disconnected browser that needs cleanup
    if (browser && !browser.isConnected() && BROWSER_TOOLS.includes(name)) {
      console.error("Detected disconnected browser before tool execution, cleaning up...");
      try {
        await browser.close().catch(() => {}); // Ignore errors
      } catch (e) {
        // Ignore any errors during cleanup
      }
      resetBrowserState();
    }

  // Prepare context based on tool requirements
  const context: ToolContext = {
    server
  };
  
  // Set up browser if needed
  if (BROWSER_TOOLS.includes(name)) {
    const browserSettings = {
      viewport: {
        width: args.width,
        height: args.height
      },
      userAgent: name === "set_user_agent" ? args.userAgent : undefined,
      headless: args.headless,
      browserType: args.browserType || 'chromium',
      device: args.device
    };
    
    try {
      context.page = await ensureBrowser(browserSettings);
      context.browser = browser;
    } catch (error) {
      console.error("Failed to ensure browser:", error);
      return {
        content: [{
          type: "text",
          text: `Failed to initialize browser: ${(error as Error).message}. Please try again.`,
        }],
        isError: true,
      };
    }
  }

    // Route to appropriate tool
    switch (name) {
      // Browser tools
      case "navigate":
        return await navigationTool.execute(args, context);
        
      case "screenshot":
        return await screenshotTool.execute(args, context);
        
      case "close":
        return await closeBrowserTool.execute(args, context);
        
      case "get_console_logs":
        return await consoleLogsTool.execute(args, context);
        
      case "click":
        return await clickTool.execute(args, context);

      case "fill":
        return await fillTool.execute(args, context);
        
      case "select":
        return await selectTool.execute(args, context);
        
      case "hover":
        return await hoverTool.execute(args, context);

      case "upload_file":
        return await uploadFileTool.execute(args, context);
        
      case "evaluate":
        return await evaluateTool.execute(args, context);

      case "get_text":
        return await visibleTextTool.execute(args, context);
      
      case "get_html":
        return await visibleHtmlTool.execute(args, context);

      case "go_back":
        return await goBackTool.execute(args, context);
      case "go_forward":
        return await goForwardTool.execute(args, context);
      case "drag":
        return await dragTool.execute(args, context);
      case "press_key":
        return await pressKeyTool.execute(args, context);

      case "check_visibility":
        return await elementVisibilityTool.execute(args, context);

      case "get_position":
        return await elementPositionTool.execute(args, context);

      case "inspect_dom":
        return await inspectDomTool.execute(args, context);

      case "get_test_ids":
        return await getTestIdsTool.execute(args, context);

      case "query_selector":
        return await querySelectorAllTool.execute(args, context);

      case "find_by_text":
        return await findByTextTool.execute(args, context);

      case "get_computed_styles":
        return await getComputedStylesTool.execute(args, context);

      case "measure_element":
        return await measureElementTool.execute(args, context);

      case "element_exists":
        return await elementExistsTool.execute(args, context);

      case "compare_positions":
        return await comparePositionsTool.execute(args, context);

      case "wait_for_element":
        return await waitForElementTool.execute(args, context);

      case "wait_for_network_idle":
        return await waitForNetworkIdleTool.execute(args, context);

      case "list_network_requests":
        return await listNetworkRequestsTool.execute(args, context);

      case "get_request_details":
        return await getRequestDetailsTool.execute(args, context);

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  } catch (error) {
    console.error(`Error handling tool ${name}:`, error);
    
    // Handle browser-specific errors at the top level
    if (BROWSER_TOOLS.includes(name)) {
      const errorMessage = (error as Error).message;
      if (
        errorMessage.includes("Target page, context or browser has been closed") || 
        errorMessage.includes("Browser has been disconnected") ||
        errorMessage.includes("Target closed") ||
        errorMessage.includes("Protocol error") ||
        errorMessage.includes("Connection closed")
      ) {
        // Reset browser state if it's a connection issue
        resetBrowserState();
        return {
          content: [{
            type: "text",
            text: `Browser connection error: ${errorMessage}. Browser state has been reset, please try again.`,
          }],
          isError: true,
        };
      }
    }

    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : String(error),
      }],
      isError: true,
    };
  }
}


/**
 * Get console logs
 */
export function getConsoleLogs(): string[] {
  return consoleLogsTool?.getConsoleLogs() ?? [];
}

/**
 * Get screenshots
 */
export function getScreenshots(): Map<string, string> {
  return screenshotTool?.getScreenshots() ?? new Map();
}

/**
 * Update last interaction timestamp
 */
export function updateLastInteractionTimestamp(): void {
  consoleLogsTool?.updateLastInteractionTimestamp();
}

/**
 * Update last navigation timestamp
 */
export function updateLastNavigationTimestamp(): void {
  consoleLogsTool?.updateLastNavigationTimestamp();
}

/**
 * Clear console logs
 */
export function clearConsoleLogs(): void {
  consoleLogsTool?.clearConsoleLogs();
}

export { registerConsoleMessage };
