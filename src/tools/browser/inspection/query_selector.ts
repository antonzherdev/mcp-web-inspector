import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';

/**
 * Interface for element match data
 */
interface ElementMatch {
  tag: string;
  selector: string;
  testId?: string;
  classes: string;
  text: string;
  position: { x: number; y: number; width: number; height: number };
  isVisible: boolean;
  isInteractive: boolean;
  opacity?: number;
  display?: string;
  attributes?: Record<string, string>;
}

/**
 * Tool for testing a selector and returning information about all matched elements
 * Useful for selector debugging and finding the right element to interact with
 */
export class QuerySelectorTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "query_selector",
      description: "Test a selector and return detailed information about all matched elements. Essential for selector debugging and finding the right element to interact with. Returns compact text format with element tag, position, text content, visibility status, and interaction capability. Shows why elements are hidden (display:none, opacity:0, zero size). Supports testid shortcuts (e.g., 'testid:submit-button'). Use limit parameter to control how many matches to show (default: 10). NEW: Use onlyVisible parameter to filter results (true=visible only, false=hidden only, undefined=all).",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand to test (e.g., 'button.submit', 'testid:login-form', 'text=Sign In')"
          },
          limit: {
            type: "number",
            description: "Maximum number of elements to return detailed info for (default: 10, recommended max: 50)"
          },
          onlyVisible: {
            type: "boolean",
            description: "Filter results by visibility: true = show only visible elements, false = show only hidden elements, undefined/not specified = show all elements (default: undefined)"
          },
          showAttributes: {
            type: "string",
            description: "Comma-separated list of HTML attributes to display for each element (e.g., 'id,name,aria-label,href,type'). If not specified, attributes are not shown."
          }
        },
        required: ["selector"],
      },
    };
  }

  /**
   * Execute the query selector all tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      const limit = args.limit ?? 10;
      const onlyVisible = args.onlyVisible; // true = visible only, false = hidden only, undefined = all
      const showAttributes = args.showAttributes
        ? args.showAttributes.split(',').map((a: string) => a.trim())
        : undefined;

      try {
        // Query all elements matching the selector
        const elements = await page.locator(selector).all();
        const totalMatches = elements.length;

        if (totalMatches === 0) {
          return createSuccessResponse(
            `No elements found matching "${args.selector}"\n\nTip: Try using inspect_dom to explore the page structure.`
          );
        }

        // Get detailed information for each element (all elements to allow filtering)
        const matchData: ElementMatch[] = [];

        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];

          try {
            const elementInfo = await element.evaluate((el, attrList) => {
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              const isVisible =
                styles.display !== 'none' &&
                styles.visibility !== 'hidden' &&
                parseFloat(styles.opacity) > 0 &&
                rect.width > 0 &&
                rect.height > 0;

              // Get test ID
              const testId =
                el.getAttribute('data-testid') ||
                el.getAttribute('data-test') ||
                el.getAttribute('data-cy') ||
                undefined;

              // Get selector representation
              let selectorRepr = '';
              if (testId) {
                const attrName = el.hasAttribute('data-testid')
                  ? 'data-testid'
                  : el.hasAttribute('data-test')
                    ? 'data-test'
                    : 'data-cy';
                selectorRepr = `${attrName}="${testId}"`;
              } else if (el.id) {
                selectorRepr = `#${el.id}`;
              } else if (el.className && typeof el.className === 'string') {
                const classes = el.className.trim().split(/\s+/).slice(0, 3).join('.');
                if (classes) {
                  selectorRepr = `class="${classes}"`;
                }
              }

              // Check if interactive
              const tag = el.tagName.toLowerCase();
              const interactiveTags = new Set(['button', 'a', 'input', 'select', 'textarea']);
              const isInteractive =
                interactiveTags.has(tag) ||
                el.hasAttribute('onclick') ||
                el.hasAttribute('contenteditable') ||
                el.getAttribute('role') === 'button';

              // Get text content (trimmed and limited)
              const text = el.textContent?.trim().slice(0, 100) || '';

              // Get requested attributes if specified
              let attributes: Record<string, string> | undefined;
              if (attrList && attrList.length > 0) {
                attributes = {};
                attrList.forEach((attr: string) => {
                  const value = el.getAttribute(attr);
                  if (value !== null) {
                    attributes![attr] = value;
                  }
                });
              }

              return {
                tag: tag,
                selector: selectorRepr,
                testId,
                classes: Array.from(el.classList).join('.'),
                text,
                position: {
                  x: Math.round(rect.x),
                  y: Math.round(rect.y),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                },
                isVisible,
                isInteractive,
                opacity: parseFloat(styles.opacity),
                display: styles.display,
                attributes,
              };
            }, showAttributes);

            matchData.push(elementInfo);
          } catch (error) {
            // Skip elements that fail evaluation (e.g., detached from DOM)
            continue;
          }
        }

        // Filter by visibility if requested
        let filteredMatches = matchData;
        if (onlyVisible !== undefined) {
          filteredMatches = matchData.filter((match) =>
            onlyVisible ? match.isVisible : !match.isVisible
          );
        }

        // Apply limit after filtering
        const displayMatches = filteredMatches.slice(0, limit);

        // Format compact text output
        const lines: string[] = [];

        // Header with counts
        if (onlyVisible === true) {
          const visibleCount = filteredMatches.length;
          lines.push(
            `Found ${totalMatches} element${totalMatches > 1 ? 's' : ''} matching "${args.selector}" (${visibleCount} visible):`
          );
        } else if (onlyVisible === false) {
          const hiddenCount = filteredMatches.length;
          lines.push(
            `Found ${totalMatches} element${totalMatches > 1 ? 's' : ''} matching "${args.selector}" (${hiddenCount} hidden):`
          );
        } else {
          lines.push(
            `Found ${totalMatches} element${totalMatches > 1 ? 's' : ''} matching "${args.selector}":`
          );
        }
        lines.push('');

        displayMatches.forEach((match, index) => {
          const prefix = `[${index}]`;

          // Element tag with selector info
          let tagInfo = `<${match.tag}`;
          if (match.selector) {
            tagInfo += ` ${match.selector}`;
          }
          tagInfo += '>';

          lines.push(`${prefix} ${tagInfo}`);

          // Position
          lines.push(
            `    @ (${match.position.x},${match.position.y}) ${match.position.width}x${match.position.height}px`
          );

          // Text content
          if (match.text) {
            const displayText = match.text.length > 50 ? match.text.slice(0, 47) + '...' : match.text;
            lines.push(`    "${displayText}"`);
          }

          // Attributes (if requested)
          if (match.attributes && Object.keys(match.attributes).length > 0) {
            Object.entries(match.attributes).forEach(([attr, value]) => {
              const displayValue = value.length > 50 ? value.slice(0, 47) + '...' : value;
              lines.push(`    ${attr}: "${displayValue}"`);
            });
          }

          // Status symbols
          const statusParts: string[] = [];
          statusParts.push(match.isVisible ? '✓ visible' : '✗ hidden');

          if (!match.isVisible) {
            // Add reason for being hidden
            if (match.display === 'none') {
              statusParts.push('display: none');
            } else if (match.opacity === 0) {
              statusParts.push('opacity: 0');
            } else if (match.position.width === 0 || match.position.height === 0) {
              statusParts.push('zero size');
            }
          }

          if (match.isInteractive) {
            statusParts.push('⚡ interactive');
          }

          lines.push(`    ${statusParts.join(', ')}`);
          lines.push('');
        });

        // Show omitted count and summary
        if (filteredMatches.length > limit) {
          const omitted = filteredMatches.length - limit;
          const matchType = onlyVisible === true ? 'visible ' : onlyVisible === false ? 'hidden ' : '';
          lines.push(
            `Showing ${limit} of ${filteredMatches.length} ${matchType}matches (${omitted} omitted)`
          );
          lines.push(
            `Use limit parameter to show more: { selector: "${args.selector}", limit: ${Math.min(filteredMatches.length, 50)} }`
          );
        } else {
          const matchWord = filteredMatches.length === 1 ? 'match' : 'matches';
          if (onlyVisible === true) {
            lines.push(`Showing ${filteredMatches.length} visible ${matchWord}`);
          } else if (onlyVisible === false) {
            lines.push(`Showing ${filteredMatches.length} hidden ${matchWord}`);
          } else {
            lines.push(`Showing all ${filteredMatches.length} ${matchWord}`);
          }
        }

        return createSuccessResponse(lines.join('\n'));
      } catch (error) {
        return createErrorResponse(`Failed to query selector: ${(error as Error).message}`);
      }
    });
  }
}
