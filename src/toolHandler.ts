import type { Browser, Page } from 'playwright';
import { chromium, firefox, webkit, devices } from 'playwright';
import { join } from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext, SessionConfig } from './tools/common/types.js';
import { checkBrowsersInstalled, getInstallationInstructions } from './utils/browserCheck.js';
import { getToolInstance, isBrowserTool, executeTool } from './tools/common/registry.js';
import { ScreenshotTool } from './tools/browser/content/screenshot.js';
import { GetConsoleLogsTool } from './tools/browser/console/get_console_logs.js';

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
let currentDevice: string | undefined;
let networkLog: NetworkRequest[] = [];

let sessionConfig: SessionConfig = {
  saveSession: false,
  userDataDir: './.mcp-web-inspector/user-data',
  screenshotsDir: './.mcp-web-inspector/screenshots',
  headlessDefault: false,
  exposeSensitiveNetworkData: false,
};

type ColorSchemeOverride = 'light' | 'dark' | 'no-preference';
let colorSchemeOverride: ColorSchemeOverride | null = null;

// Resolve package root for child processes (like npx). Entry point sets
// MCP_WEB_INSPECTOR_PACKAGE_ROOT using import.meta.url; tests and other
// environments fall back to process.cwd().
const PACKAGE_ROOT = process.env.MCP_WEB_INSPECTOR_PACKAGE_ROOT || process.cwd();

/**
 * Sets the session configuration
 */
export function setSessionConfig(config: Partial<SessionConfig>) {
  sessionConfig = { ...sessionConfig, ...config };
}

/**
 * Gets the current session configuration
 */
export function getSessionConfig(): SessionConfig {
  return sessionConfig;
}

/**
 * Gets the screenshots directory
 */
export function getScreenshotsDir(): string {
  return sessionConfig.screenshotsDir;
}

/**
 * Gets the default headless setting
 */
export function getHeadlessDefault(): boolean {
  return sessionConfig.headlessDefault;
}

/**
 * Resets browser and page variables
 * Used when browser is closed
 */
export function resetBrowserState() {
  browser = undefined;
  page = undefined;
  currentBrowserType = 'chromium';
  currentDevice = undefined;
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
export async function setGlobalPage(newPage: Page): Promise<void> {
  page = newPage;

  // Register console message handlers and network listeners for the new page
  await registerConsoleMessage(page);
  await registerNetworkListeners(page);
  await applyColorScheme(page);

  page.bringToFront();// Bring the new tab to the front
  console.error("Global page has been updated with listeners registered.");
}

function getColorSchemeValue(): ColorSchemeOverride | null {
  return colorSchemeOverride;
}

async function applyColorScheme(targetPage: Page | undefined): Promise<void> {
  if (!targetPage) return;

  const scheme = getColorSchemeValue();

  try {
    // Some test environments or mocks may not implement emulateMedia
    const anyPage = targetPage as any;
    if (typeof anyPage.emulateMedia === 'function') {
      await anyPage.emulateMedia({ colorScheme: scheme ?? null });
      return;
    }

    // Fallback: if emulateMedia is unavailable, do a best-effort hint via CSS.
    // This won't fully emulate prefers-color-scheme but avoids throwing in tests.
    if (scheme) {
      const css = scheme === 'dark' ? ':root{color-scheme: dark;}'
        : scheme === 'light' ? ':root{color-scheme: light;}'
        : ':root{color-scheme: light dark;}';
      if (typeof anyPage.addStyleTag === 'function') {
        await anyPage.addStyleTag({ content: css });
      }
    }
  } catch (error) {
    // Swallow errors to keep color scheme application non-fatal
    console.warn("Failed to apply color scheme (non-fatal):", error);
  }
}

export async function setColorSchemeOverride(
  scheme: ColorSchemeOverride | null
): Promise<void> {
  colorSchemeOverride = scheme;
  if (page && !page.isClosed()) {
    await applyColorScheme(page);
  }
}

export function getColorSchemeOverride(): ColorSchemeOverride | null {
  return colorSchemeOverride;
}

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
  // Mobile devices
  'iphone-se': 'iPhone SE',
  'iphone-14': 'iPhone 14',
  'iphone-14-pro': 'iPhone 14 Pro',
  'pixel-5': 'Pixel 5',
  'ipad': 'iPad (gen 7)',
  'samsung-s21': 'Galaxy S21',

  // Desktop devices (custom configs)
  'desktop-1080p': 'Desktop 1080p',
  'desktop-2k': 'Desktop 2K',
  'laptop-hd': 'Laptop HD'
};

/**
 * Custom device configurations for presets not in Playwright's built-in devices
 */
const CUSTOM_DEVICE_CONFIGS: Record<string, any> = {
  'Desktop 1080p': {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.23 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    screen: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    defaultBrowserType: 'chromium'
  },
  'Desktop 2K': {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.23 Safari/537.36',
    viewport: { width: 2560, height: 1440 },
    screen: { width: 2560, height: 1440 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    defaultBrowserType: 'chromium'
  },
  'Laptop HD': {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.23 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    screen: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    defaultBrowserType: 'chromium'
  }
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
    const consoleLogsTool = getToolInstance("get_console_logs", null) as GetConsoleLogsTool;
    if (consoleLogsTool) {
      const type = msg.type();
      let text = msg.text();

      // "Unhandled Rejection In Promise" we injected
      if (text.startsWith("[Playwright]")) {
        const payload = text.replace("[Playwright]", "");
        consoleLogsTool.registerConsoleMessage("exception", payload);
      } else {
        // Truncate stack traces for error messages to keep output compact
        if (type === 'error' && text.includes('\n')) {
          const lines = text.split('\n');
          // Keep first line (error message) and up to 3 stack trace lines
          if (lines.length > 4) {
            text = lines.slice(0, 4).join('\n') + '\n  ...[stack trace truncated]';
          }
        }
        consoleLogsTool.registerConsoleMessage(type, text);
      }
    }
  });

  // Uncaught exception
  page.on("pageerror", (error) => {
    const consoleLogsTool = getToolInstance("get_console_logs", null) as GetConsoleLogsTool;
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

// Track if we've checked browser installation
let browserInstallationChecked = false;

/**
 * Gets the screen size using Playwright's API
 */
async function getScreenSize(): Promise<{ width: number; height: number }> {
  try {
    // Launch a temporary browser to get screen size
    const tempBrowser = await chromium.launch({ headless: true });
    const tempContext = await tempBrowser.newContext();
    const tempPage = await tempContext.newPage();

    const screenSize = await tempPage.evaluate(() => {
      return {
        width: window.screen.width,
        height: window.screen.height
      };
    });

    await tempBrowser.close();

    // Validate the screen size values
    if (!screenSize || typeof screenSize.width !== 'number' || typeof screenSize.height !== 'number') {
      console.warn('Invalid screen size detected, using defaults');
      return { width: 1280, height: 720 };
    }

    return screenSize;
  } catch (error) {
    console.warn('Failed to detect screen size, using defaults:', error);
    return { width: 1280, height: 720 };
  }
}

/**
 * Ensures a browser is launched and returns the page
 */
export async function ensureBrowser(browserSettings?: BrowserSettings) {
  try {
    // Check if browsers are installed on first launch (only once)
    if (!browser && !browserInstallationChecked) {
      browserInstallationChecked = true;
      const browserCheck = checkBrowsersInstalled();
      if (!browserCheck.installed) {
        // Try to install browsers automatically
        console.warn('🎭 Playwright browsers not found. Installing automatically...');
        console.warn('⏳ This will download ~1GB of browser binaries. Please wait...');
        try {
          const { execSync } = await import('child_process');
          execSync('npx playwright install chromium firefox webkit', {
            stdio: 'inherit',
            encoding: 'utf8',
            cwd: PACKAGE_ROOT,
          });
          console.error('✅ Browsers installed successfully! Starting browser...');
          // Note: browser variable is still undefined here, which is correct.
          // The code below (line 342) will launch the browser after installation.
        } catch (installError) {
          // If auto-install fails, show instructions
          const instructions = getInstallationInstructions();
          throw new Error(`Playwright browsers not installed.\n\n${instructions}`);
        }
      }
    }

    // Check if browser exists but is disconnected
    if (browser && !browser.isConnected()) {
      console.warn("Browser exists but is disconnected. Cleaning up...");
      try {
        await browser.close().catch(err => console.error("Error closing disconnected browser:", err));
      } catch (e) {
        // Ignore errors when closing disconnected browser
      }
      // Reset browser and page references
      resetBrowserState();
    }

    // Check if device preset has changed (requires browser restart)
    if (browser && browserSettings?.device && browserSettings.device !== currentDevice) {
      console.warn(`Device preset changed from ${currentDevice || 'none'} to ${browserSettings.device}. Restarting browser...`);
      try {
        await browser.close().catch(err => console.error("Error closing browser on device change:", err));
      } catch (e) {
        // Ignore errors when closing browser
      }
      resetBrowserState();
    }

    // If browser exists and viewport settings changed, resize the viewport
    if (browser && page && !page.isClosed() && browserSettings?.viewport) {
      const { width, height } = browserSettings.viewport;
      // Only resize if width or height are explicitly provided
      if (width !== undefined || height !== undefined) {
        const currentViewport = page.viewportSize();
        const targetWidth = width ?? currentViewport?.width ?? 1280;
        const targetHeight = height ?? currentViewport?.height ?? 720;

        // Check if viewport size actually changed
        if (!currentViewport || currentViewport.width !== targetWidth || currentViewport.height !== targetHeight) {
          console.error(`Resizing viewport to ${targetWidth}x${targetHeight}`);
          await page.setViewportSize({ width: targetWidth, height: targetHeight });
        }
      }
    }

    // Launch new browser if needed
    if (!browser) {
      const { viewport, userAgent, headless = sessionConfig.headlessDefault, browserType = 'chromium', device } = browserSettings ?? {};

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
        // Check custom configs first, then Playwright's built-in devices
        deviceConfig = CUSTOM_DEVICE_CONFIGS[playwrightDeviceName] || devices[playwrightDeviceName];
        if (deviceConfig) {
          console.error(`Using device preset: ${device} (${playwrightDeviceName})`);
          currentDevice = device;
        } else {
          console.warn(`Warning: Device preset ${playwrightDeviceName} not found`);
          currentDevice = undefined;
        }
      } else {
        currentDevice = undefined;
      }

      console.warn(`Launching new ${browserType} browser instance...`);

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

      // Determine viewport size
      let viewportWidth: number;
      let viewportHeight: number;

      if (viewport?.width !== undefined || viewport?.height !== undefined) {
        // If any viewport dimension is specified, use specified values or defaults
        viewportWidth = viewport?.width ?? 1280;
        viewportHeight = viewport?.height ?? 720;
      } else {
        // If no viewport specified, detect screen size
        const screenSize = await getScreenSize();
        viewportWidth = screenSize?.width ?? 1280;
        viewportHeight = screenSize?.height ?? 720;
        if (screenSize && screenSize.width > 0 && screenSize.height > 0) {
          console.error(`No viewport specified, using screen size: ${viewportWidth}x${viewportHeight}`);
        }
      }

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
          width: viewportWidth,
          height: viewportHeight,
        };
        contextOptions.deviceScaleFactor = 1;
      }

      // Use persistent context if session saving is enabled
      if (sessionConfig.saveSession) {
        console.warn(`Launching ${browserType} with persistent context at ${sessionConfig.userDataDir}...`);

        const context = await browserInstance.launchPersistentContext(sessionConfig.userDataDir, contextOptions);

        // Get the browser instance from the context
        browser = context.browser()!;
        currentBrowserType = browserType;

        // Add cleanup logic when browser is disconnected
        browser.on('disconnected', () => {
          console.warn("Browser disconnected event triggered");
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
          console.warn("Browser disconnected event triggered");
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
            width: viewportWidth,
            height: viewportHeight,
          };
          newContextOptions.deviceScaleFactor = 1;
        }

        const context = await browser.newContext(newContextOptions);

        page = await context.newPage();
      }

      // Register console message handler and network listeners
      await registerConsoleMessage(page);
      await registerNetworkListeners(page);
      await applyColorScheme(page);
    }
    
    // Verify page is still valid
    if (!page || page.isClosed()) {
      console.warn("Page is closed or invalid. Creating new page...");
      // Create a new page if the current one is invalid
      const context = browser.contexts()[0] || await browser.newContext();
      page = await context.newPage();
      
      // Re-register console message handler and network listeners
      await registerConsoleMessage(page);
      await registerNetworkListeners(page);
      await applyColorScheme(page);
    }
    
    await applyColorScheme(page);
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
    const { viewport, userAgent, headless = sessionConfig.headlessDefault, browserType = 'chromium', device } = browserSettings ?? {};

    // Get device configuration if device preset is specified
    let deviceConfig = null;
    if (device && DEVICE_PRESETS[device]) {
      const playwrightDeviceName = DEVICE_PRESETS[device];
      // Check custom configs first, then Playwright's built-in devices
      deviceConfig = CUSTOM_DEVICE_CONFIGS[playwrightDeviceName] || devices[playwrightDeviceName];
      if (deviceConfig) {
        currentDevice = device;
      } else {
        currentDevice = undefined;
      }
    } else {
      currentDevice = undefined;
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

    // Determine viewport size for retry
    let retryViewportWidth: number;
    let retryViewportHeight: number;

    if (viewport?.width !== undefined || viewport?.height !== undefined) {
      // If any viewport dimension is specified, use specified values or defaults
      retryViewportWidth = viewport?.width ?? 1280;
      retryViewportHeight = viewport?.height ?? 720;
    } else {
      // If no viewport specified, detect screen size
      const screenSize = await getScreenSize();
      retryViewportWidth = screenSize?.width ?? 1280;
      retryViewportHeight = screenSize?.height ?? 720;
    }

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
        width: retryViewportWidth,
        height: retryViewportHeight,
      };
      retryContextOptions.deviceScaleFactor = 1;
    }

    // Use persistent context if session saving is enabled
    if (sessionConfig.saveSession) {
      console.warn(`Launching ${browserType} with persistent context at ${sessionConfig.userDataDir} (retry)...`);

      const context = await browserInstance.launchPersistentContext(sessionConfig.userDataDir, retryContextOptions);

      browser = context.browser()!;
      currentBrowserType = browserType;

      browser.on('disconnected', () => {
        console.warn("Browser disconnected event triggered (retry)");
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
        console.warn("Browser disconnected event triggered (retry)");
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
          width: retryViewportWidth,
          height: retryViewportHeight,
        };
        retryNewContextOptions.deviceScaleFactor = 1;
      }

      const context = await browser.newContext(retryNewContextOptions);

      page = await context.newPage();
    }

    await registerConsoleMessage(page);
    await registerNetworkListeners(page);
    await applyColorScheme(page);

    return page!;
  }
}


/**
 * Main handler for tool calls
 */
export async function handleToolCall(
  name: string,
  args: any,
  server: any
): Promise<CallToolResult> {
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

    const requiresBrowser = isBrowserTool(name);

    // Check if we have a disconnected browser that needs cleanup
    if (browser && !browser.isConnected() && requiresBrowser) {
      console.warn("Detected disconnected browser before tool execution, cleaning up...");
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
    if (requiresBrowser) {
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

    // Route to appropriate tool using registry
    return await executeTool(name, args, context, server);
  } catch (error) {
    console.error(`Error handling tool ${name}:`, error);
    
    // Handle browser-specific errors at the top level
    if (isBrowserTool(name)) {
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
  const consoleLogsTool = getToolInstance("get_console_logs", null) as GetConsoleLogsTool;
  return consoleLogsTool?.getConsoleLogs() ?? [];
}

/**
 * Get console logs captured after the last navigation
 */
export function getConsoleLogsSinceLastNavigation(): string[] {
  const consoleLogsTool = getToolInstance("get_console_logs", null) as GetConsoleLogsTool;
  if (!consoleLogsTool) return [];
  return consoleLogsTool.getLogsSinceLastNavigation();
}

/**
 * Get console logs captured after the last interaction
 */
export function getConsoleLogsSinceLastInteraction(): string[] {
  const consoleLogsTool = getToolInstance("get_console_logs", null) as GetConsoleLogsTool;
  if (!consoleLogsTool) return [];
  // Expose a compact accessor mirroring navigation-based retrieval
  return (consoleLogsTool as any).getLogsSinceLastInteraction?.() ?? [];
}

/**
 * Get screenshots
 */
export function getScreenshots(): Map<string, string> {
  const screenshotTool = getToolInstance("visual_screenshot_for_humans", null) as ScreenshotTool;
  return screenshotTool?.getScreenshots() ?? new Map();
}

/**
 * Update last interaction timestamp
 */
export function updateLastInteractionTimestamp(): void {
  const consoleLogsTool = getToolInstance("get_console_logs", null) as GetConsoleLogsTool;
  consoleLogsTool?.updateLastInteractionTimestamp();
}

/**
 * Update last navigation timestamp
 */
export function updateLastNavigationTimestamp(): void {
  const consoleLogsTool = getToolInstance("get_console_logs", null) as GetConsoleLogsTool;
  consoleLogsTool?.updateLastNavigationTimestamp();
}

/**
 * Clear console logs
 */
export function clearConsoleLogs(): void {
  const consoleLogsTool = getToolInstance("get_console_logs", null) as GetConsoleLogsTool;
  consoleLogsTool?.clearConsoleLogs();
}

export { registerConsoleMessage };
