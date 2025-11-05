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
   * Normalize selector shortcuts and fix common escaping mistakes safely.
   * - "testid:foo" → "[data-testid=\"foo\"]"
   * - "data-test:bar" → "[data-test=\"bar\"]"
   * - "data-cy:baz" → "[data-cy=\"baz\"]"
   * - Convert simple ID-only selectors with special chars to Playwright's id engine:
   *     "#radix-\:rc\:-content-123" → "id=radix-:rc:-content-123"
   * - Remove unnecessary escapes for bracket characters only (\\[ and \\])
   *   DO NOT unescape colons globally — colons in class/ID names must stay escaped in CSS.
   * @param selector The selector string
   * @returns Normalized selector
   */
  protected normalizeSelector(selector: string): string {
    const prefixMap: Record<string, string> = {
      'testid:': 'data-testid',
      'data-test:': 'data-test',
      'data-cy:': 'data-cy',
    };

    // Handle testid shortcuts first
    for (const [prefix, attr] of Object.entries(prefixMap)) {
      if (selector.startsWith(prefix)) {
        const value = selector.slice(prefix.length);
        return `[${attr}="${value}"]`;
      }
    }

    const trimmed = selector.trim();

    // Helper: unescape simple backslash-escapes used inside IDs (e.g., \:, \[, \])
    const unescapeCssIdentifier = (s: string): string => {
      // Collapse multiple backslashes before a single char to the char itself
      return s
        .replace(/\\+:/g, ':')
        .replace(/\\+\[/g, '[')
        .replace(/\\+\]/g, ']');
    };

    // If this looks like a simple, standalone ID selector (no combinators or descendants),
    // switch to Playwright's id engine. This avoids CSS escaping pitfalls with colons.
    if (/^#[^\s>+~]+$/.test(trimmed)) {
      const idToken = trimmed.slice(1);
      // Only switch to id= engine if ID contains characters that commonly break CSS (#... with colons or escapes)
      if (idToken.includes('\\') || idToken.includes(':') || idToken.includes('[') || idToken.includes(']')) {
        const idValue = unescapeCssIdentifier(idToken);
        return `id=${idValue}`;
      }
      // Otherwise, keep simple IDs as-is
      return trimmed;
    }

    // For general CSS selectors, preserve required escapes for special chars.
    // Collapse over-escaping (e.g., \\\\[ → \\[, but keep a single backslash before [ ] :)
    let cleaned = trimmed;
    cleaned = cleaned.replace(/\\{2,}(?=\[)/g, '\\');
    cleaned = cleaned.replace(/\\{2,}(?=\])/g, '\\');
    cleaned = cleaned.replace(/\\{2,}(?=:)/g, '\\');
    return cleaned;
  }

  /**
   * Sanitize verbose Playwright selector engine messages by removing stack traces and
   * keeping only the essential syntax error information.
   */
  protected sanitizeSelectorEngineMessage(msg: string): string {
    if (!msg) return '';

    // Prefer to cut at the common phrase used by the browser
    const cutoffPhrases = [
      "is not a valid selector.",
      "is not a valid selector",
    ];

    for (const phrase of cutoffPhrases) {
      const idx = msg.indexOf(phrase);
      if (idx !== -1) {
        return msg.slice(0, idx + phrase.length).trim();
      }
    }

    // Otherwise remove stack-like lines (e.g., " at query (…)")
    const lines = msg.split(/\r?\n/);
    const filtered = lines.filter(l => !/^\s*at\b/.test(l) && !/<anonymous>:\d+:\d+/.test(l));
    return filtered.join('\n').trim();
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
    let count: number;

    try {
      count = await locator.count();
    } catch (error) {
      // Catch selector syntax errors and provide helpful guidance
      const errorMsg = (error as Error).message;
      const selector = options?.originalSelector || 'selector';

      if (errorMsg.includes('Unexpected token') ||
          errorMsg.includes('Invalid selector') ||
          errorMsg.includes('SyntaxError') ||
          errorMsg.includes('selector')) {
        const conciseMsg = this.sanitizeSelectorEngineMessage(errorMsg);
        // Helpful, accurate guidance with Tailwind-style examples
        const tips = [
          '💡 Tips:',
          '  • Tailwind arbitrary values need escaping in class selectors: .min-w-\\[300px\\]',
          '  • Colons in class names must be escaped: .dark\\:bg-gray-700',
          '  • Prefer robust selectors: use testid:name or [data-testid="..."]',
          '  • Attribute selectors avoid escaping issues: [class*="min-w-[300px]"]',
          '',
          'Examples:',
          '  ✓ .min-w-\\[300px\\] .flex-1',
          '  ✓ testid:submit-button',
          '  ✓ #login-form'
        ].join('\n');

        throw new Error(
          `Invalid CSS selector: "${selector}"\n\n` +
          (conciseMsg ? `Selector syntax error: ${conciseMsg}\n\n` : '') +
          tips
        );
      }

      // Re-throw other errors as-is
      throw error;
    }

    if (count === 0) {
      throw new Error('No elements found');
    }

    // Check for multiple elements with errorOnMultiple flag
    if (options?.errorOnMultiple && count > 1) {
      const selector = options.originalSelector || 'selector';
      const nthHint = ''.trimEnd();
      const warning = ''.trimEnd();

      let message = `Selector "${selector}" matched ${count} elements. Please use a more specific selector.`;
      if (nthHint) {
        message += `\n${nthHint}`;
      }
      if (warning) {
        message += `\n${warning}`;
      }

      {
        const guidance = [
          `1) Preferred: add a unique data-testid and select it directly (e.g., testid:submit).`,
          `2) If you cannot change markup: append \`>> nth=<index>\` to target a specific match.`,
        ];
        const matchesDetails = await this.describeMatchedElements(locator, selector, count);
        message += `\n${guidance.join('\n')}\n\nMatches:\n${matchesDetails}`;
        throw new Error(message);
      }
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
    const usesNth = selector.includes('>> nth=');
    if (totalCount <= 1) {
      // Even when a single element is ultimately targeted, discourage nth usage
      // because it is brittle across layout/content changes.
      if (usesNth) {
        return "💡 Tip: Selector uses '>> nth='. Prefer adding a unique data-testid for robust selection.";
      }
      return '';
    }

    const duplicateWarning = this.getDuplicateTestIdWarning(selector, totalCount).trimEnd();
    const nthHint = this.buildNthSelectorHint(selector, totalCount).trimEnd();
    const avoidNth = usesNth ? "💡 Tip: Avoid relying on '>> nth='; add a unique data-testid instead." : '';
    const extraHints = [duplicateWarning, nthHint, avoidNth].filter(Boolean).join('\n');

    const baseMessage = preferredVisible
      ? `⚠ Found ${totalCount} elements matching "${selector}", using element ${elementIndex + 1} (first visible)`
      : `⚠ Found ${totalCount} elements matching "${selector}", using element ${elementIndex + 1}`;

    return extraHints ? `${baseMessage}\n${extraHints}` : baseMessage;
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
      return (
        `💡 Tip: Test IDs should be unique. Consider making this test ID unique to avoid ambiguity.\n` +
        `   Primary fix: assign a unique data-testid to the intended element.\n` +
        `   Workaround: if you cannot change markup, you may use '>> nth=<index>' temporarily.\n\n`
      );
    }

    // Suggest testid for non-testid selectors
    return (
      `💡 Tip: Consider adding a unique data-testid attribute for more reliable selection.\n` +
      `   Primary fix: add data-testid and target it (e.g., testid:submit).\n` +
      `   Workaround: use '>> nth=<index>' only when you can't add test IDs.\n\n`
    );
  }

  /**
   * Provide a hint for using >> nth= when multiple elements match a selector
   *
   * @param selector Original selector string
   * @param totalCount Total number of matches
   */
  protected buildNthSelectorHint(selector: string, totalCount: number): string {
    const trimmed = selector.trim();
    if (!trimmed || trimmed.includes('>> nth=')) {
      return '';
    }

    const firstExample = `${trimmed} >> nth=0`;
    const lastIndex = Math.max(totalCount - 1, 1);
    const lastExample = `${trimmed} >> nth=${lastIndex}`;

    return (
      `Primary fix: add a unique data-testid to the intended element and select it directly.\n` +
      `Workaround: Append ">> nth=<index>" to target a specific match when you cannot change markup.\n` +
      `   Example: ${firstExample} (first match)\n` +
      `   Or: ${lastExample} (last match)\n` +
      `Note: nth selectors are brittle and may break with layout/content changes.\n` +
      `Prefer unique data-testid attributes for long-term stability.`
    );
  }

  /**
   * Describe matched elements in a compact, copyable format for disambiguation errors.
   * Shows: index, tag, trimmed text, nearest parent marker, and a suggested selector.
   * Suggests testid:VALUE when present; otherwise falls back to id=VALUE or original >> nth=i.
   */
  protected async describeMatchedElements(locator: any, originalSelector: string, count: number): Promise<string> {
    const maxItems = Math.min(count, 5);
    const lines: string[] = [];

    for (let i = 0; i < maxItems; i++) {
      const nth = locator.nth(i);
      try {
        const info = await nth.evaluate((el: any) => {
          const tag = (el.tagName || '').toLowerCase();
          let text = (el as HTMLElement).innerText || el.textContent || '';
          text = (text || '').replace(/\s+/g, ' ').trim();
          const testid = el.getAttribute?.('data-testid') || el.getAttribute?.('data-test') || el.getAttribute?.('data-cy') || null;
          const id = (el as HTMLElement).id || null;
          let parentLabel: string | null = null;
          let p: any = el.parentElement;
          while (p && !parentLabel) {
            const ptid = p.getAttribute?.('data-testid');
            const ptest = p.getAttribute?.('data-test');
            const pcy = p.getAttribute?.('data-cy');
            const pid = (p as HTMLElement).id || null;
            if (ptid) parentLabel = `[data-testid="${ptid}"]`;
            else if (ptest) parentLabel = `[data-test="${ptest}"]`;
            else if (pcy) parentLabel = `[data-cy="${pcy}"]`;
            else if (pid) parentLabel = `#${pid}`;
            p = p.parentElement;
          }
          return { tag, text, testid, id, parentLabel };
        });

        const truncatedText = info.text && info.text.length > 80 ? `${info.text.slice(0, 77)}...` : info.text;

        let selectorSuggestion = `${originalSelector} >> nth=${i}`;
        let altSuggestion: string | undefined;
        if (info?.testid) {
          selectorSuggestion = `testid:${info.testid}`;
          altSuggestion = `${originalSelector} >> nth=${i}`;
        } else if (info?.id) {
          selectorSuggestion = `id=${info.id}`;
          altSuggestion = `${originalSelector} >> nth=${i}`;
        }

        const parts = [
          `[${i}] <${info.tag}>${truncatedText ? ` "${truncatedText}"` : ''}`,
          info.parentLabel ? `    parent: ${info.parentLabel}` : undefined,
          `    selector: ${selectorSuggestion}`,
          altSuggestion ? `    alt: ${altSuggestion}` : undefined,
        ].filter(Boolean) as string[];

        lines.push(parts.join('\n'));
      } catch {
        lines.push(`[${i}] (element)\n    selector: ${originalSelector} >> nth=${i}`);
      }
    }

    if (count > maxItems) {
      lines.push(`… and ${count - maxItems} more matches (use >> nth=<index> to target).`);
    }

    return lines.join('\n');
  }
}
