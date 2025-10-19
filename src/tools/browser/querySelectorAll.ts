import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

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
}

/**
 * Tool for testing a selector and returning information about all matched elements
 * Useful for selector debugging and finding the right element to interact with
 */
export class QuerySelectorAllTool extends BrowserToolBase {
  /**
   * Execute the query selector all tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      const limit = args.limit ?? 10;

      try {
        // Query all elements matching the selector
        const elements = await page.locator(selector).all();
        const totalMatches = elements.length;

        if (totalMatches === 0) {
          return createSuccessResponse(
            `No elements found matching "${args.selector}"\n\nTip: Try using playwright_inspect_dom to explore the page structure.`
          );
        }

        // Get detailed information for each element (up to limit)
        const matchData: ElementMatch[] = [];
        const elementsToProcess = elements.slice(0, limit);

        for (let i = 0; i < elementsToProcess.length; i++) {
          const element = elementsToProcess[i];

          try {
            const elementInfo = await element.evaluate((el) => {
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
              };
            });

            matchData.push(elementInfo);
          } catch (error) {
            // Skip elements that fail evaluation (e.g., detached from DOM)
            continue;
          }
        }

        // Format compact text output
        const lines: string[] = [];
        lines.push(
          `Found ${totalMatches} element${totalMatches > 1 ? 's' : ''} matching "${args.selector}":`
        );
        lines.push('');

        matchData.forEach((match, index) => {
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

        // Show omitted count
        if (totalMatches > limit) {
          const omitted = totalMatches - limit;
          lines.push(
            `Showing ${limit} of ${totalMatches} matches (${omitted} omitted)`
          );
          lines.push(`Use limit parameter to show more: { selector: "${args.selector}", limit: ${Math.min(totalMatches, 50)} }`);
        } else {
          lines.push(`Showing all ${totalMatches} matches`);
        }

        return createSuccessResponse(lines.join('\n'));
      } catch (error) {
        return createErrorResponse(`Failed to query selector: ${(error as Error).message}`);
      }
    });
  }
}
