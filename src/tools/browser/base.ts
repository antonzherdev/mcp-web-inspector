import type { Browser, Page } from 'playwright';
import { ToolHandler, ToolContext, ToolResponse, createErrorResponse } from '../common/types.js';

/**
 * Base class for all browser-based tools
 * Provides common functionality and error handling
 */
export abstract class BrowserToolBase implements ToolHandler {
  protected server: any;

  constructor(server: any) {
    this.server = server;
  }

  /**
   * Main execution method that all tools must implement
   */
  abstract execute(args: any, context: ToolContext): Promise<ToolResponse>;

  /**
   * Normalize selector shortcuts to full Playwright selectors
   * - "testid:foo" → "[data-testid='foo']"
   * - "data-test:bar" → "[data-test='bar']"
   * - "data-cy:baz" → "[data-cy='baz']"
   * - Everything else → pass through
   * @param selector The selector string
   * @returns Normalized selector
   */
  protected normalizeSelector(selector: string): string {
    const prefixMap: Record<string, string> = {
      'testid:': 'data-testid',
      'data-test:': 'data-test',
      'data-cy:': 'data-cy',
    };

    for (const [prefix, attr] of Object.entries(prefixMap)) {
      if (selector.startsWith(prefix)) {
        const value = selector.slice(prefix.length);
        return `[${attr}="${value}"]`;
      }
    }

    return selector;  // CSS, text=, etc. pass through
  }

  /**
   * Ensures a page is available and returns it
   * @param context The tool context containing browser and page
   * @returns The page or null if not available
   */
  protected ensurePage(context: ToolContext): Page | null {
    if (!context.page) {
      return null;
    }
    return context.page;
  }

  /**
   * Validates that a page is available and returns an error response if not
   * @param context The tool context
   * @returns Either null if page is available, or an error response
   */
  protected validatePageAvailable(context: ToolContext): ToolResponse | null {
    if (!this.ensurePage(context)) {
      return createErrorResponse("Browser page not initialized!");
    }
    return null;
  }

  /**
   * Safely executes a browser operation with proper error handling
   * @param context The tool context
   * @param operation The async operation to perform
   * @returns The tool response
   */
  protected async safeExecute(
    context: ToolContext,
    operation: (page: Page) => Promise<ToolResponse>
  ): Promise<ToolResponse> {
    const pageError = this.validatePageAvailable(context);
    if (pageError) return pageError;

    try {
      // Verify browser is connected before proceeding
      if (context.browser && !context.browser.isConnected()) {
        // If browser exists but is disconnected, reset state
        const { resetBrowserState } = await import('../../toolHandler.js');
        resetBrowserState();
        return createErrorResponse("Browser is disconnected. Please retry the operation.");
      }

      // Check if page is closed
      if (context.page.isClosed()) {
        return createErrorResponse("Page is closed. Please retry the operation.");
      }

      return await operation(context.page!);
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Check for common browser disconnection errors
      if (
        errorMessage.includes("Target page, context or browser has been closed") ||
        errorMessage.includes("Target closed") ||
        errorMessage.includes("Browser has been disconnected") ||
        errorMessage.includes("Protocol error") ||
        errorMessage.includes("Connection closed")
      ) {
        // Reset browser state on connection issues
        const { resetBrowserState } = await import('../../toolHandler.js');
        resetBrowserState();
        return createErrorResponse(`Browser connection error: ${errorMessage}. Connection has been reset - please retry the operation.`);
      }

      return createErrorResponse(`Operation failed: ${errorMessage}`);
    }
  }

  /**
   * Record that a user interaction occurred (for console log filtering)
   */
  protected recordInteraction(): void {
    import('../../toolHandler.js').then(({ updateLastInteractionTimestamp }) => {
      updateLastInteractionTimestamp();
    });
  }

  /**
   * Record that a navigation occurred (for console log filtering)
   */
  protected recordNavigation(): void {
    import('../../toolHandler.js').then(({ updateLastNavigationTimestamp }) => {
      updateLastNavigationTimestamp();
    });
  }

  /**
   * Select preferred element from a Playwright locator (for tools using Playwright API)
   * Prefers first visible element, falls back to first element if none visible
   *
   * Usage for inspection tools (allow multiple, support elementIndex):
   * ```typescript
   * const locator = page.locator(selector);
   * const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator, {
   *   elementIndex: args.elementIndex  // optional 1-based index
   * });
   * const warning = this.formatElementSelectionInfo(selector, elementIndex, totalCount);
   * ```
   *
   * Usage for interaction tools (error on multiple):
   * ```typescript
   * const locator = page.locator(selector);
   * const { element } = await this.selectPreferredLocator(locator, {
   *   errorOnMultiple: true,
   *   originalSelector: args.selector  // for error message
   * });
   * // Will throw if multiple elements found
   * await element.click();
   * ```
   *
   * @param locator Playwright locator that may match multiple elements
   * @param options Configuration options
   * @param options.elementIndex Optional 1-based index to select specific element (for inspection tools)
   * @param options.errorOnMultiple If true, throw error when multiple elements match (for interaction tools)
   * @param options.originalSelector Original selector string for error messages
   * @returns Object with { element: Locator, elementIndex: number, totalCount: number }
   */
  protected async selectPreferredLocator(
    locator: any,
    options?: {
      elementIndex?: number;
      errorOnMultiple?: boolean;
      originalSelector?: string;
    }
  ): Promise<{
    element: any;
    elementIndex: number;
    totalCount: number;
  }> {
    const count = await locator.count();

    if (count === 0) {
      throw new Error('No elements found');
    }

    // Check for multiple elements with errorOnMultiple flag
    if (options?.errorOnMultiple && count > 1) {
      const selector = options.originalSelector || 'selector';
      const warning = this.getDuplicateTestIdWarning(selector, count);
      throw new Error(
        `Selector "${selector}" matched ${count} elements. Please use a more specific selector.\n${warning.trimEnd()}`
      );
    }

    // Handle explicit element index (1-based)
    if (options?.elementIndex !== undefined) {
      const idx = options.elementIndex;
      if (idx < 1 || idx > count) {
        throw new Error(
          `Only ${count} element(s) found, cannot select element ${idx}`
        );
      }
      return {
        element: locator.nth(idx - 1), // Convert to 0-based
        elementIndex: idx - 1,
        totalCount: count,
      };
    }

    // Single element - return it
    if (count === 1) {
      return {
        element: locator.first(),
        elementIndex: 0,
        totalCount: 1,
      };
    }

    // Multiple elements - prefer first visible one
    for (let i = 0; i < count; i++) {
      const nth = locator.nth(i);
      const isVisible = await nth.isVisible();
      if (isVisible) {
        return {
          element: nth,
          elementIndex: i,
          totalCount: count,
        };
      }
    }

    // No visible elements - fall back to first
    return {
      element: locator.first(),
      elementIndex: 0,
      totalCount: count,
    };
  }

  /**
   * Format a message indicating which element was selected when multiple match
   *
   * @param selector Original selector string
   * @param elementIndex 0-based index of selected element
   * @param totalCount Total number of matching elements
   * @param preferredVisible Whether visibility preference was used
   * @returns Formatted string or empty if only one element
   */
  protected formatElementSelectionInfo(
    selector: string,
    elementIndex: number,
    totalCount: number,
    preferredVisible: boolean = true
  ): string {
    if (totalCount <= 1) {
      return '';
    }

    const duplicateWarning = this.getDuplicateTestIdWarning(selector, totalCount);

    if (preferredVisible) {
      return `⚠ Found ${totalCount} elements matching "${selector}", using element ${elementIndex + 1} (first visible)\n${duplicateWarning}`;
    } else {
      return `⚠ Found ${totalCount} elements matching "${selector}", using element ${elementIndex + 1}\n${duplicateWarning}`;
    }
  }

  /**
   * Generate a warning message if the selector is a testid and there are duplicates
   *
   * @param selector The selector that was used
   * @param totalCount Number of matching elements
   * @returns Warning message with suggestion, or empty string if not applicable
   */
  protected getDuplicateTestIdWarning(selector: string, totalCount: number): string {
    if (totalCount <= 1) {
      return '';
    }

    // Check if this is a testid-style selector
    const isTestIdSelector =
      selector.startsWith('testid:') ||
      selector.startsWith('data-test:') ||
      selector.startsWith('data-cy:') ||
      selector.match(/^\[data-(testid|test|cy)=/);

    if (isTestIdSelector) {
      return `💡 Tip: Test IDs should be unique. Consider making this test ID unique to avoid ambiguity.\n\n`;
    }

    return '\n';
  }
} 