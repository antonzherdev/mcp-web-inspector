import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';

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
    return this.safeExecute(context, async (page) => {
      const maxLength = args.maxLength || 20000;
      const selector = args.selector ? this.normalizeSelector(args.selector) : 'body';

      try {
        const locator = page.locator(selector);
        const count = await locator.count();

        if (count === 0) {
          return createErrorResponse(`Element not found: ${args.selector || 'body'}`);
        }

        const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator, {
          elementIndex: args.elementIndex
        });

        const text = await element.innerText();
        const truncated = text.length > maxLength;
        const displayText = truncated ? text.substring(0, maxLength) + '...[truncated]' : text;

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

        messages.push(displayText);

        if (truncated) {
          messages.push('');
          messages.push(`⚠ Text truncated at ${maxLength} characters (original length: ${text.length})`);
          messages.push(`   Use maxLength parameter to retrieve more text if needed.`);
        }

        return createSuccessResponse(messages.join('\n'));
      } catch (error) {
        return createErrorResponse(`Failed to get text: ${(error as Error).message}`);
      }
    });
  }
}
