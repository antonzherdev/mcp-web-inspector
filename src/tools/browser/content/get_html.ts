import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';

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
    return this.safeExecute(context, async (page) => {
      const maxLength = args.maxLength || 20000;
      const selector = args.selector ? this.normalizeSelector(args.selector) : 'body';
      const clean = args.clean ?? false;

      try {
        const locator = page.locator(selector);
        const count = await locator.count();

        if (count === 0) {
          return createErrorResponse(`Element not found: ${args.selector || 'body'}`);
        }

        const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator, {
          elementIndex: args.elementIndex
        });

        let html = await element.innerHTML();

        // Clean HTML based on options
        if (clean) {
          // Remove scripts, styles, comments, meta tags
          html = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<meta\b[^>]*>/gi, '');
        } else {
          // Just remove scripts for safety/size
          html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }

        const truncated = html.length > maxLength;
        const displayHtml = truncated ? html.substring(0, maxLength) + '...[truncated]' : html;

        const messages = [];

        // Add selection warning if multiple elements matched
        const selectionWarning = this.formatElementSelectionInfo(
          args.selector || 'body',
          elementIndex,
          totalCount,
          true
        );
        if (selectionWarning) {
          messages.push(selectionWarning.trimEnd());
        }

        messages.push(displayHtml);

        if (truncated) {
          messages.push('');
          messages.push(`⚠ HTML truncated at ${maxLength} characters (original length: ${html.length})`);
          messages.push(`   Use maxLength parameter to retrieve more HTML if needed.`);
        }

        return createSuccessResponse(messages.join('\n'));
      } catch (error) {
        return createErrorResponse(`Failed to get HTML: ${(error as Error).message}`);
      }
    });
  }
}
