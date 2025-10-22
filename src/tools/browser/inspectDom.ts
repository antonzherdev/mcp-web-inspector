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
      const maxDepth = args.maxDepth ?? 5;

      try {
        // Get the target element and its semantic children
        const inspectionData = await page.evaluate(
          ({ sel, hidden, max, maxDepth }) => {
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
                'audio',
                'svg',
                'canvas',
                'iframe',
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

            // Count elements for summary
            const elementCounts: { [key: string]: number } = {};
            const interactiveCounts: { [key: string]: number } = {};

            // Helper to count elements in entire subtree (for overview)
            const countElementsInTree = (root: Element) => {
              const counts: { [key: string]: number } = {};
              const interactiveCounts: { [key: string]: number } = {};

              const traverse = (el: Element) => {
                const tag = el.tagName.toLowerCase();
                counts[tag] = (counts[tag] || 0) + 1;

                if (isInteractive(el)) {
                  interactiveCounts[tag] = (interactiveCounts[tag] || 0) + 1;
                }

                Array.from(el.children).forEach(traverse);
              };

              traverse(root);
              return { counts, interactiveCounts };
            };

            // Recursive helper to collect semantic children, drilling through non-semantic wrappers
            const collectSemanticChildren = (elements: Element[], depth: number = 0): void => {

              for (const child of elements) {
                const childInfo = getElementInfo(child);
                const tag = child.tagName.toLowerCase();

                // Count all immediate children for summary (depth 0 only)
                if (depth === 0) {
                  elementCounts[tag] = (elementCounts[tag] || 0) + 1;
                }

                // Skip hidden elements unless includeHidden is true
                if (!hidden && !childInfo.isVisible) {
                  if (depth === 0) skippedWrappers++;
                  continue;
                }

                // Check if this element is semantic
                const isSemantic = isSemanticElement(child);

                if (isSemantic) {
                  // This is a semantic element - add it to the list and stop drilling
                  const text = child.textContent?.trim().slice(0, 100) || '';
                  const testId =
                    child.getAttribute('data-testid') ||
                    child.getAttribute('data-test') ||
                    child.getAttribute('data-cy') ||
                    undefined;

                  const semanticChild = {
                    tag: child.tagName.toLowerCase(),
                    selector: getSelector(child),
                    testId,
                    role: child.getAttribute('role') || undefined,
                    text,
                    position: childInfo.rect,
                    isVisible: childInfo.isVisible,
                    isInteractive: isInteractive(child),
                    childCount: child.children.length,
                  };

                  semanticChildren.push(semanticChild);

                  // Count this semantic element in interactiveCounts if it's interactive
                  if (isInteractive(child)) {
                    interactiveCounts[tag] = (interactiveCounts[tag] || 0) + 1;
                  }
                } else if (depth < maxDepth) {
                  // This is a non-semantic wrapper - drill through it to find semantic children
                  if (depth === 0) skippedWrappers++;

                  // Recursively look for semantic children inside this wrapper
                  collectSemanticChildren(Array.from(child.children), depth + 1);
                } else {
                  // Hit max depth - count as skipped wrapper
                  if (depth === 0) skippedWrappers++;
                }
              }
            };

            // Start collecting semantic children from immediate children
            collectSemanticChildren(allChildren);

            // For body/main containers, also count elements in entire tree
            const targetTag = target.tagName.toLowerCase();
            const isTopLevelContainer = targetTag === 'body' || sel.includes('main-layout') || sel.includes('main');
            let treeCounts = null;
            if (isTopLevelContainer) {
              const treeData = countElementsInTree(target);
              const testIdCount = target.querySelectorAll('[data-testid], [data-test], [data-cy]').length;
              treeCounts = {
                ...treeData,
                testIdCount,
              };
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
              elementCounts,
              interactiveCounts,
              treeCounts,
              layoutPattern,
            };
          },
          { sel: selector, hidden: includeHidden, max: maxChildren, maxDepth }
        );

        // Check for errors from evaluate
        if ('error' in inspectionData) {
          return createErrorResponse(inspectionData.error);
        }

        // Format compact text output
        const lines: string[] = [];
        const { target, children, stats, layoutPattern, elementCounts, interactiveCounts, treeCounts } = inspectionData;

        // Header
        lines.push(`DOM Inspection: <${target.tag}${target.selector ? ' ' + target.selector : ''}>`);
        lines.push(
          `@ (${target.position.x},${target.position.y}) ${target.position.width}x${target.position.height}px`
        );
        lines.push('');

        // Add page/section overview for top-level containers
        if (treeCounts) {
          lines.push('Page Overview:');

          // Show semantic structure counts
          const semanticStructure = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'];
          const structureCounts = semanticStructure
            .filter(tag => (treeCounts.counts[tag] || 0) > 0)
            .map(tag => `${treeCounts.counts[tag]} ${tag}${treeCounts.counts[tag] > 1 ? 's' : ''}`)
            .join(', ');
          if (structureCounts) {
            lines.push(`  Structure: ${structureCounts}`);
          }

          // Show interactive element counts
          const interactiveTypes = ['button', 'a', 'input', 'select', 'textarea'];
          const interactiveSummary = interactiveTypes
            .filter(tag => (treeCounts.interactiveCounts[tag] || 0) > 0)
            .map(tag => {
              const count = treeCounts.interactiveCounts[tag];
              const label = tag === 'a' ? 'link' : tag;
              return `${count} ${label}${count > 1 ? 's' : ''}`;
            })
            .join(', ');
          if (interactiveSummary) {
            lines.push(`  Interactive: ${interactiveSummary}`);
          }

          // Show form counts
          const formCount = treeCounts.counts.form || 0;
          const inputCount = (treeCounts.counts.input || 0) + (treeCounts.counts.select || 0) + (treeCounts.counts.textarea || 0);
          if (formCount > 0) {
            lines.push(`  Forms: ${formCount} form${formCount > 1 ? 's' : ''} with ${inputCount} input${inputCount !== 1 ? 's' : ''}`);
          }

          // Show test coverage
          if (treeCounts.testIdCount && treeCounts.testIdCount > 0) {
            lines.push(`  Test Coverage: ${treeCounts.testIdCount} element${treeCounts.testIdCount > 1 ? 's' : ''} with test IDs`);
          }

          lines.push('');
        }

        // Children summary
        if (stats.semanticCount === 0) {
          lines.push(`Children (0 semantic, skipped ${stats.skippedWrappers} wrapper divs):`);
          lines.push('');

          // Show interactive element summary if available
          const hasInteractive = Object.keys(interactiveCounts).length > 0;
          if (hasInteractive) {
            lines.push('Interactive Elements Found:');
            const interactiveTypes = ['button', 'a', 'input', 'select', 'textarea'];
            interactiveTypes.forEach(tag => {
              const count = interactiveCounts[tag] || 0;
              if (count > 0) {
                const label = tag === 'a' ? 'link' : tag;
                lines.push(`  • ${count} ${label}${count > 1 ? 's' : ''}`);
              }
            });
            lines.push('');
            lines.push(`💡 Tip: Use maxChildren parameter or drill down with specific selectors (e.g., "button", "a")`);
            lines.push(`   to inspect these elements. They were skipped because they lack test IDs or semantic containers.`);
          } else {
            lines.push('⚠ No semantic or interactive elements found at this level.');
            lines.push('');
            lines.push(
              'The page uses generic <div> wrappers without semantic HTML, test IDs, or ARIA roles.'
            );
          }
          lines.push('');
          lines.push('Suggestions:');
          lines.push(`1. Use get_visible_html({ selector: "${args.selector || 'body'}" }) to see raw HTML`);
          lines.push('2. Look for interactive elements by class/id (e.g., .button, #submit-btn)');
          lines.push('3. Recommend adding data-testid attributes for better testability');
          lines.push('');
          lines.push('To improve this page\'s structure, consider:');
          lines.push('  - Adding semantic HTML: <header>, <main>, <nav>, <button>');
          lines.push('  - Adding test IDs: data-testid="submit-button"');
          lines.push('  - Adding ARIA roles: role="button", role="navigation"');

          // Add drill-down suggestions when Page Overview shows interactive but Children shows none
          if (treeCounts && Object.keys(interactiveCounts).length === 0 && Object.keys(treeCounts.interactiveCounts).length > 0) {
            lines.push('');
            lines.push('💡 Try drilling down to find interactive elements:');

            const currentSelector = args.selector || 'body';
            // Suggest specific selectors based on what's in the tree
            if (treeCounts.interactiveCounts.button && treeCounts.interactiveCounts.button > 0) {
              lines.push(`   inspect_dom({ selector: "${currentSelector} button" })`);
            }
            if (treeCounts.interactiveCounts.input && treeCounts.interactiveCounts.input > 0) {
              lines.push(`   inspect_dom({ selector: "${currentSelector} input" })`);
            }
            if (treeCounts.interactiveCounts.a && treeCounts.interactiveCounts.a > 0) {
              lines.push(`   inspect_dom({ selector: "${currentSelector} a" })`);
            }
          }
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

            // Calculate distances from all parent edges
            const fromLeft = child.position.x - target.position.x;
            const fromRight = (target.position.x + target.position.width) - (child.position.x + child.position.width);
            const fromTop = child.position.y - target.position.y;
            const fromBottom = (target.position.y + target.position.height) - (child.position.y + child.position.height);

            // Format edge distances (centering is obvious: equal left/right = horizontal center, equal top/bottom = vertical center)
            lines.push(`    from edges: ←${fromLeft}px →${fromRight}px ↑${fromTop}px ↓${fromBottom}px`);

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

          // Suggest inspect_ancestors when drilling through many wrappers
          if (stats.skippedWrappers >= 3) {
            lines.push('');
            lines.push(`💡 Drilled through ${stats.skippedWrappers} wrapper levels. To see parent constraints:`);
            lines.push(`   inspect_ancestors({ selector: "${args.selector || 'body'}" })`);
          }
        }

        return createSuccessResponse(lines.join('\n'));
      } catch (error) {
        return createErrorResponse(`Failed to inspect DOM: ${(error as Error).message}`);
      }
    });
  }
}
