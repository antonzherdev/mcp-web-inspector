import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Interface for semantic child element data
 */
interface SemanticChildElement {
  tag: string;
  selector: string;
  testId?: string;
  role?: string;
  text: string;
  position: { x: number; y: number; width: number; height: number };
  isVisible: boolean;
  isInteractive: boolean;
  childCount: number;
}

/**
 * Tool for progressive DOM inspection with semantic filtering and spatial layout
 * This is the PRIMARY tool for understanding page structure
 */
export class InspectDomTool extends BrowserToolBase {
  /**
   * Execute the DOM inspection tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector = args.selector ? this.normalizeSelector(args.selector) : 'body';
      const includeHidden = args.includeHidden ?? false;
      const maxChildren = args.maxChildren ?? 20;

      try {
        // Get the target element and its semantic children
        const inspectionData = await page.evaluate(
          ({ sel, hidden, max }) => {
            const target = document.querySelector(sel);
            if (!target) {
              return { error: `Element not found: ${sel}` };
            }

            // Get element info
            const getElementInfo = (el: Element) => {
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              const isVisible =
                styles.display !== 'none' &&
                styles.visibility !== 'hidden' &&
                parseFloat(styles.opacity) > 0 &&
                rect.width > 0 &&
                rect.height > 0;

              return {
                rect: {
                  x: Math.round(rect.x),
                  y: Math.round(rect.y),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                },
                isVisible,
                styles: {
                  display: styles.display,
                  visibility: styles.visibility,
                  opacity: parseFloat(styles.opacity),
                },
              };
            };

            // Check if element is semantic (worth showing)
            const isSemanticElement = (el: Element): boolean => {
              const tag = el.tagName.toLowerCase();

              // Semantic HTML tags
              const semanticTags = new Set([
                'header',
                'nav',
                'main',
                'article',
                'section',
                'aside',
                'footer',
                'form',
                'button',
                'input',
                'select',
                'textarea',
                'a',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'p',
                'ul',
                'ol',
                'li',
                'table',
                'img',
                'video',
                'dialog',
                'details',
                'summary',
              ]);

              if (semanticTags.has(tag)) return true;

              // Elements with test IDs
              if (
                el.hasAttribute('data-testid') ||
                el.hasAttribute('data-test') ||
                el.hasAttribute('data-cy')
              ) {
                return true;
              }

              // Elements with ARIA roles
              if (el.hasAttribute('role')) return true;

              // Interactive elements
              if (el.hasAttribute('onclick') || el.hasAttribute('contenteditable')) return true;

              // Containers with significant direct text (>10 chars)
              const directText = Array.from(el.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent?.trim() || '')
                .join(' ')
                .trim();

              if (directText.length > 10) return true;

              return false;
            };

            // Get selector for element
            const getSelector = (el: Element): string => {
              // Prefer test IDs
              if (el.hasAttribute('data-testid')) {
                return `[data-testid="${el.getAttribute('data-testid')}"]`;
              }
              if (el.hasAttribute('data-test')) {
                return `[data-test="${el.getAttribute('data-test')}"]`;
              }
              if (el.hasAttribute('data-cy')) {
                return `[data-cy="${el.getAttribute('data-cy')}"]`;
              }

              // Use ID if available
              if (el.id) {
                return `#${el.id}`;
              }

              // Use class + tag for common patterns
              const tag = el.tagName.toLowerCase();
              const classes = Array.from(el.classList)
                .slice(0, 2)
                .join('.');
              if (classes) {
                return `${tag}.${classes}`;
              }

              return tag;
            };

            // Check if element is interactive
            const isInteractive = (el: Element): boolean => {
              const tag = el.tagName.toLowerCase();
              const interactiveTags = new Set(['button', 'a', 'input', 'select', 'textarea']);
              return (
                interactiveTags.has(tag) ||
                el.hasAttribute('onclick') ||
                el.hasAttribute('contenteditable') ||
                el.getAttribute('role') === 'button'
              );
            };

            // Get target element info
            const targetInfo = getElementInfo(target);

            // Get all immediate children
            const allChildren = Array.from(target.children);
            const semanticChildren: any[] = [];
            let skippedWrappers = 0;

            for (const child of allChildren) {
              const childInfo = getElementInfo(child);

              // Skip hidden elements unless includeHidden is true
              if (!hidden && !childInfo.isVisible) {
                skippedWrappers++;
                continue;
              }

              // Check if semantic
              if (isSemanticElement(child)) {
                const text = child.textContent?.trim().slice(0, 100) || '';
                const testId =
                  child.getAttribute('data-testid') ||
                  child.getAttribute('data-test') ||
                  child.getAttribute('data-cy') ||
                  undefined;

                semanticChildren.push({
                  tag: child.tagName.toLowerCase(),
                  selector: getSelector(child),
                  testId,
                  role: child.getAttribute('role') || undefined,
                  text,
                  position: childInfo.rect,
                  isVisible: childInfo.isVisible,
                  isInteractive: isInteractive(child),
                  childCount: child.children.length,
                });
              } else {
                skippedWrappers++;
              }
            }

            // Limit children shown
            const totalSemantic = semanticChildren.length;
            const shownChildren = semanticChildren.slice(0, max);
            const omittedCount = Math.max(0, totalSemantic - max);

            // Detect layout pattern
            let layoutPattern = 'unknown';
            if (shownChildren.length >= 2) {
              const first = shownChildren[0].position;
              const second = shownChildren[1].position;

              const horizontalGap = Math.abs(second.x - (first.x + first.width));
              const verticalGap = Math.abs(second.y - (first.y + first.height));

              if (horizontalGap < 50 && verticalGap > 20) {
                layoutPattern = 'vertical';
              } else if (verticalGap < 50 && horizontalGap > 20) {
                layoutPattern = 'horizontal';
              } else if (horizontalGap < 50 && verticalGap < 50) {
                layoutPattern = 'grid';
              }
            }

            return {
              target: {
                tag: target.tagName.toLowerCase(),
                selector: getSelector(target),
                position: targetInfo.rect,
                isVisible: targetInfo.isVisible,
              },
              children: shownChildren,
              stats: {
                totalChildren: allChildren.length,
                semanticCount: totalSemantic,
                shownCount: shownChildren.length,
                omittedCount,
                skippedWrappers,
              },
              layoutPattern,
            };
          },
          { sel: selector, hidden: includeHidden, max: maxChildren }
        );

        // Check for errors from evaluate
        if ('error' in inspectionData) {
          return createErrorResponse(inspectionData.error);
        }

        // Format compact text output
        const lines: string[] = [];
        const { target, children, stats, layoutPattern } = inspectionData;

        // Header
        lines.push(`DOM Inspection: <${target.tag}${target.selector ? ' ' + target.selector : ''}>`);
        lines.push(
          `@ (${target.position.x},${target.position.y}) ${target.position.width}x${target.position.height}px`
        );
        lines.push('');

        // Children summary
        if (stats.semanticCount === 0) {
          lines.push(`Children (0 semantic, skipped ${stats.skippedWrappers} wrapper divs):`);
          lines.push('');
          lines.push('⚠ No semantic elements found at this level.');
          lines.push('');
          lines.push(
            'The page uses generic <div> wrappers without semantic HTML, test IDs, or ARIA roles.'
          );
          lines.push('');
          lines.push('Suggestions:');
          lines.push(`1. Use playwright_get_visible_html({ selector: "${args.selector || 'body'}" }) to see raw HTML`);
          lines.push('2. Look for interactive elements by class/id (e.g., .button, #submit-btn)');
          lines.push('3. Recommend adding data-testid attributes for better testability');
          lines.push('');
          lines.push('To improve this page\'s structure, consider:');
          lines.push('  - Adding semantic HTML: <header>, <main>, <nav>, <button>');
          lines.push('  - Adding test IDs: data-testid="submit-button"');
          lines.push('  - Adding ARIA roles: role="button", role="navigation"');
        } else {
          lines.push(
            `Children (${stats.shownCount} of ${stats.semanticCount}${stats.skippedWrappers > 0 ? `, skipped ${stats.skippedWrappers} wrappers` : ''}):`
          );
          lines.push('');

          // List children
          children.forEach((child: SemanticChildElement, index: number) => {
            const prefix = `[${index}]`;
            const tag = child.testId
              ? `<${child.tag} data-testid="${child.testId}">`
              : `<${child.tag}${child.selector ? ' ' + child.selector : ''}>`;

            const roleInfo = child.role ? ` | ${child.role}` : '';
            lines.push(`${prefix} ${tag}${roleInfo}`);

            // Position
            lines.push(
              `    @ (${child.position.x},${child.position.y}) ${child.position.width}x${child.position.height}px`
            );

            // Calculate offset from previous sibling
            if (index > 0) {
              const prev = children[index - 1];
              const horizontalGap = child.position.x - (prev.position.x + prev.position.width);
              const verticalGap = child.position.y - (prev.position.y + prev.position.height);

              if (Math.abs(horizontalGap) < 50 && verticalGap > 10) {
                // Vertical layout
                lines.push(`    gap from [${index - 1}]: ↓${Math.round(verticalGap)}px (vertical layout)`);
              } else if (Math.abs(verticalGap) < 50 && horizontalGap > 10) {
                // Horizontal layout
                lines.push(
                  `    gap from [${index - 1}]: →${Math.round(horizontalGap)}px (horizontal layout)`
                );
              }
            }

            // Text content
            if (child.text) {
              lines.push(`    "${child.text}"`);
            }

            // Status symbols
            const statusParts: string[] = [];
            statusParts.push(child.isVisible ? '✓ visible' : '✗ hidden');
            if (child.isInteractive) statusParts.push('⚡ interactive');
            if (child.childCount > 0) statusParts.push(`${child.childCount} children`);
            if (child.testId) statusParts.push('has test ID');

            lines.push(`    ${statusParts.join(', ')}`);
            lines.push('');
          });

          // Omitted elements notice
          if (stats.omittedCount > 0) {
            lines.push(`... ${stats.omittedCount} more semantic children omitted (use maxChildren to show more)`);
            lines.push('');
          }

          // Layout pattern
          if (layoutPattern !== 'unknown') {
            lines.push(`Layout: ${layoutPattern}`);
          }

          // Mixed structure tip
          if (stats.skippedWrappers > 0 && stats.semanticCount > 0) {
            lines.push('');
            lines.push(`💡 Tip: Some elements found, but ${stats.skippedWrappers} wrapper divs were skipped.`);
            lines.push('   Consider adding test IDs to key elements for easier selection.');
          }
        }

        return createSuccessResponse(lines.join('\n'));
      } catch (error) {
        return createErrorResponse(`Failed to inspect DOM: ${(error as Error).message}`);
      }
    });
  }
}
