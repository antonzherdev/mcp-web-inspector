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
 * Tool for getting HTML from the page
 */
export class GetHtmlTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "get_html",
      description: "⚠️ RARELY NEEDED: Get raw HTML markup from the page (no rendering, just source code). Most tasks need structured inspection instead. ONLY use get_html for: (1) checking specific HTML attributes or element nesting, (2) analyzing markup structure, (3) debugging SSR/HTML issues. For structured tasks, use: inspect_dom() to understand page structure with positions, query_selector() to find and inspect elements, get_computed_styles() for CSS values. Returns HTML up to 20000 chars (truncated if longer), scripts removed by default for security/size. Supports testid shortcuts.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand to limit HTML extraction to a specific container. Omit to get entire page HTML. Example: 'testid:main-content' or '#app'"
          },
          elementIndex: {
            type: "number",
            description: "When selector matches multiple elements, use this 1-based index to select a specific one (e.g., 2 = second element). Default: first visible element."
          },
          clean: {
            type: "boolean",
            description: "Remove noise from HTML: false (default) = remove scripts only, true = remove scripts + styles + comments + meta tags for minimal markup"
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
    const clean = args.clean ?? false;

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
        const lines: string[] = [`HTML content${scopeLabel}`];
        let selectionWarning = '';
        let rawHtml = '';

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

          rawHtml = await element.evaluate((target: Element | null) => {
            if (!target) {
              return '';
            }
            const htmlElement = target as HTMLElement;
            if (typeof htmlElement.outerHTML === 'string') {
              return htmlElement.outerHTML;
            }
            return htmlElement.innerHTML ?? '';
          });
        } else {
          rawHtml = await page.content();
        }

        rawHtml = rawHtml ?? '';

        const sanitizedHtml = await page.evaluate(
          ({ html, clean }): string => {
            if (!html) {
              return '';
            }

            const stripScripts = (input: string) =>
              input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            const stripStyles = (input: string) =>
              input.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
            const stripComments = (input: string) => input.replace(/<!--[\s\S]*?-->/g, '');
            const stripMeta = (input: string) => input.replace(/<meta\b[^>]*>/gi, '');

            let cleaned = stripScripts(html);
            if (clean) {
              cleaned = stripMeta(stripComments(stripStyles(cleaned)));
            }
            return cleaned;
          },
          { html: rawHtml, clean }
        );

        if (selectionWarning) {
          lines.push(selectionWarning.trimEnd());
        }

        lines.push(
          clean
            ? 'clean mode enabled (scripts, styles, comments, meta removed)'
            : 'scripts removed (clean=false default)'
        );
        lines.push('');

        const safeMaxLength = requestedMaxLength > 0 ? requestedMaxLength : 20000;
        const processedHtml = sanitizedHtml ?? '';
        const originalLength = processedHtml.length;
        let displayHtml = processedHtml;
        const truncated = displayHtml.length > safeMaxLength;

        if (truncated) {
          displayHtml = `${displayHtml.slice(0, safeMaxLength)}\n<!-- Output truncated due to size limits -->`;
        }

        lines.push(displayHtml);

        if (truncated) {
          lines.push('');
          lines.push(
            `Output truncated due to size limits (returned ${safeMaxLength} of ${originalLength} characters)`
          );
        }

        lines.push('');
        lines.push('💡 TIP: If you need structured inspection, try inspect_dom(), query_selector(), or get_computed_styles().');

        return createSuccessResponse(lines.join('\n'));
      } catch (error) {
        return createErrorResponse(`Failed to get visible HTML content: ${(error as Error).message}`);
      }
    });
  }
}
