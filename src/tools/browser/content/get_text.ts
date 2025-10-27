import { BrowserToolBase } from '../base.js';
import {
  ToolContext,
  ToolResponse,
  ToolMetadata,
  SessionConfig,
  createSuccessResponse,
  createErrorResponse,
} from '../../common/types.js';

/**
 * Tool for getting visible text from the page
 */
export class GetTextTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "get_text",
      description: "⚠️ RARELY NEEDED: Get ALL visible text content from the entire page (no structure, just raw text). Most tasks need structured inspection instead. ONLY use get_text for: (1) extracting text for content analysis (word count, language detection), (2) searching for text when location is completely unknown, (3) text-only snapshots for comparison. For structured tasks, use: inspect_dom() to understand page structure, find_by_text() to locate specific text with context, query_selector() to find elements. Returns plain text up to 20000 chars (truncated if longer). Supports testid shortcuts.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand to limit text extraction to a specific container. Omit to get text from entire page. Example: 'testid:article-body' or '#main-content'"
          },
          elementIndex: {
            type: "number",
            description: "When selector matches multiple elements, use this 1-based index to select a specific one (e.g., 2 = second element). Default: first visible element."
          },
          maxLength: {
            type: "number",
            description: "Maximum number of characters to return (default: 20000)"
          }
        },
        required: [],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    const requestedMaxLength =
      typeof args.maxLength === 'number' && Number.isFinite(args.maxLength) && args.maxLength > 0
        ? Math.floor(args.maxLength)
        : 20000;

    if (!context.page) {
      return createErrorResponse('Page is not available');
    }

    if (context.browser && !context.browser.isConnected()) {
      return createErrorResponse('Browser is not connected');
    }

    if (context.page.isClosed()) {
      return createErrorResponse('Page is not available or has been closed');
    }

    return this.safeExecute(context, async (page) => {
      try {
        const hasSelector = typeof args.selector === 'string' && args.selector.length > 0;
        const scopeLabel = hasSelector ? ` (from "${args.selector}")` : ' (entire page)';
        const lines: string[] = [`Visible text content${scopeLabel}`];

        let selectionWarning = '';
        let textContent = '';

        if (hasSelector) {
          const normalizedSelector = this.normalizeSelector(args.selector);
          const locator = page.locator(normalizedSelector);

          const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator, {
            elementIndex: args.elementIndex,
          });

          selectionWarning = this.formatElementSelectionInfo(
            args.selector,
            elementIndex,
            totalCount,
            true
          );

          textContent = await element.evaluate((target: HTMLElement | null) => {
            if (!target) {
              return '';
            }
            if (typeof target.innerText === 'string') {
              return target.innerText;
            }
            return target.textContent ?? '';
          });
        } else {
          textContent = await page.evaluate(() => document.body?.innerText ?? '');
        }

        textContent = textContent ?? '';

        if (selectionWarning) {
          lines.push(selectionWarning.trimEnd());
        }

        lines.push('');

        const safeMaxLength = requestedMaxLength > 0 ? requestedMaxLength : 20000;
        let displayText = textContent;
        const truncated = displayText.length > safeMaxLength;

        if (truncated) {
          displayText = `${displayText.slice(0, safeMaxLength)}\n[Output truncated due to size limits]`;
        }

        lines.push(displayText);

        if (truncated) {
          lines.push('');
          lines.push(
            `Output truncated due to size limits (returned ${safeMaxLength} of ${textContent.length} characters)`
          );
        }

        lines.push('');
        lines.push('💡 TIP: If you need structured inspection, try inspect_dom(), find_by_text(), or query_selector().');

        return createSuccessResponse(lines.join('\n'));
      } catch (error) {
        return createErrorResponse(`Failed to get visible text content: ${(error as Error).message}`);
      }
    });
  }
}
