import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';

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
  scrollable?: {
    vertical: boolean;
    horizontal: boolean;
    overflowY?: number;
    overflowX?: number;
  };
}

/**
 * Tool for progressive DOM inspection with semantic filtering and spatial layout
 * This is the PRIMARY tool for understanding page structure
 */
export class InspectDomTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "inspect_dom",
      description: `START HERE FOR LAYOUT DEBUGGING: Progressive DOM inspection that shows parent-child relationships, centering issues, and spacing gaps. Skips wrapper divs and shows only semantic elements (header, nav, main, form, button, elements with test IDs, ARIA roles, etc.).

WORKFLOW: Call without selector for page overview, then drill down by calling with child's selector.

DETECTS: Parent-relative positioning, vertical/horizontal centering, sibling spacing gaps, layout patterns.

OUTPUT FORMAT:
[0] <button data-testid="menu">
    @ (16,8) 40×40px                         ← Absolute viewport position (x,y) and size
    from edges: ←16px →1144px ↑8px ↓8px      ← Distance from parent edges (↑8px = ↓8px means vertically centered)
    "Menu"
    ✓ visible, ⚡ interactive

[1] <div data-testid="title">
    @ (260,2) 131×28px
    from edges: ←244px →244px ↑2px ↓42px     ← Equal left/right (244px) = horizontally centered, unequal top/bottom = NOT vertically centered
    gap from [0]: →16px                      ← Spacing between siblings
    "Title"
    ✓ visible, 2 children

SYMBOLS: ✓=visible, ✗=hidden, ⚡=interactive, ←→=horizontal edges, ↑↓=vertical edges
CENTERING: Equal left/right distances = horizontally centered, equal top/bottom = vertically centered

RELATED TOOLS: For comparing TWO elements' alignment (not parent-child), use compare_element_alignment(). For box model (padding/margin), use measure_element().

More efficient than get_html() or evaluate(). Supports testid shortcuts.`,
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand to inspect. Omit for page overview (defaults to body). Use 'testid:login-form', '#main', etc."
          },
          includeHidden: {
            type: "boolean",
            description: "Include hidden elements in results (default: false)"
          },
          maxChildren: {
            type: "number",
            description: "Maximum number of children to show (default: 20)"
          },
          maxDepth: {
            type: "number",
            description: "Maximum depth to drill through non-semantic wrapper elements when looking for semantic children (default: 5). Increase for extremely deeply nested components, decrease to 1 to see only immediate children without drilling."
          },
          elementIndex: {
            type: "number",
            description: "When selector matches multiple elements, use this 1-based index to select a specific one (e.g., 2 = second element). Default: first visible element."
          }
        },
        required: [],
      },
    };
  }

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
        // Use consistent element selection (Playwright's visibility detection)
        const locator = page.locator(selector);
        const count = await locator.count();

        if (count === 0) {
          return createErrorResponse(`Element not found: ${args.selector || 'body'}`);
        }

        const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator);

        // Get the target element and its semantic children
        const inspectionData = await element.evaluate(
          (target: Element, { hidden, max, maxDepth }) => {
            // Helper to check if element is visible
            const isElementVisible = (el: Element): boolean => {
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              return (
                styles.display !== 'none' &&
                styles.visibility !== 'hidden' &&
                parseFloat(styles.opacity) > 0 &&
                rect.width > 0 &&
                rect.height > 0
              );
            };

            // Get element info
            const getElementInfo = (el: Element) => {
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              const isVisible = isElementVisible(el);

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

              // Scrollable containers (actual overflow, not just CSS)
              const hasVerticalScroll = el.scrollHeight > el.clientHeight;
              const hasHorizontalScroll = el.scrollWidth > el.clientWidth;
              if (hasVerticalScroll || hasHorizontalScroll) return true;

              return false;
            };

            // Helper to get preferred test ID attribute
            const getTestId = (el: Element): string | null => {
              return (
                el.getAttribute('data-testid') ||
                el.getAttribute('data-test') ||
                el.getAttribute('data-cy') ||
                null
              );
            };

            // Get selector for element
            const getSelector = (el: Element): string => {
              // Prefer test IDs
              const testId = getTestId(el);
              if (testId) {
                return `[data-testid="${testId}"]`;
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
            const targetTestId = getTestId(target);
            const targetRole = target.getAttribute('role') || undefined;
            const targetText = target.textContent?.trim().slice(0, 120) || '';
            const targetSemantic = {
              isSemantic: isSemanticElement(target),
              isInteractive: isInteractive(target),
              testId: targetTestId || undefined,
              role: targetRole,
              text: targetText,
            };

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
                  const testId = getTestId(child) || undefined;

                  // Detect scrollable content
                  const hasVerticalScroll = child.scrollHeight > child.clientHeight;
                  const hasHorizontalScroll = child.scrollWidth > child.clientWidth;
                  const scrollable = (hasVerticalScroll || hasHorizontalScroll) ? {
                    vertical: hasVerticalScroll,
                    horizontal: hasHorizontalScroll,
                    overflowY: hasVerticalScroll ? child.scrollHeight - child.clientHeight : undefined,
                    overflowX: hasHorizontalScroll ? child.scrollWidth - child.clientWidth : undefined,
                  } : undefined;

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
                    scrollable,
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

            // Collect deep preview candidates when wrappers dominate
            const deepPreview: any[] = [];
            const deepPreviewLimit = 3;
            const deepPreviewMaxDepth = Math.min(Math.max(maxDepth + 5, 12), 20);
            const targetArea = Math.max(targetInfo.rect.width * targetInfo.rect.height, 1);

            const collectDeepPreview = (elements: Element[], depth: number): void => {
              if (deepPreview.length >= deepPreviewLimit || depth > deepPreviewMaxDepth) {
                return;
              }

              for (const child of elements) {
                const childInfo = getElementInfo(child);

                // Skip hidden children unless explicitly requested
                if (!hidden && !childInfo.isVisible) {
                  continue;
                }

                const semantic = isSemanticElement(child);
                if (semantic && depth > maxDepth) {
                  const area = Math.max(childInfo.rect.width * childInfo.rect.height, 0);
                  const areaRatio = targetArea > 0 ? area / targetArea : null;

                  // Detect scrollable content
                  const hasVerticalScroll = child.scrollHeight > child.clientHeight;
                  const hasHorizontalScroll = child.scrollWidth > child.clientWidth;
                  const scrollable = (hasVerticalScroll || hasHorizontalScroll) ? {
                    vertical: hasVerticalScroll,
                    horizontal: hasHorizontalScroll,
                    overflowY: hasVerticalScroll ? child.scrollHeight - child.clientHeight : undefined,
                    overflowX: hasHorizontalScroll ? child.scrollWidth - child.clientWidth : undefined,
                  } : undefined;

                  deepPreview.push({
                    tag: child.tagName.toLowerCase(),
                    selector: getSelector(child),
                    testId: getTestId(child) || undefined,
                    role: child.getAttribute('role') || undefined,
                    text: child.textContent?.trim().slice(0, 80) || '',
                    isVisible: childInfo.isVisible,
                    isInteractive: isInteractive(child),
                    depth,
                    areaRatio,
                    position: childInfo.rect,
                    childCount: child.children.length,
                    scrollable,
                  });
                }

                if (deepPreview.length >= deepPreviewLimit) {
                  break;
                }

                collectDeepPreview(Array.from(child.children), depth + 1);
                if (deepPreview.length >= deepPreviewLimit) {
                  break;
                }
              }
            };

            if (skippedWrappers > 0) {
              collectDeepPreview(allChildren, 1);
            }

            // For body/main containers, also count elements in entire tree
            const targetTag = target.tagName.toLowerCase();
            const isTopLevelContainer = targetTag === 'body' || targetTag === 'main';
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
              targetSemantic,
              deepPreview,
            };
          },
          { hidden: includeHidden, max: maxChildren, maxDepth }
        );

        // Add element selection info from Playwright
        const result = {
          ...inspectionData,
          elementIndex,
          totalCount,
        };

        // Check for errors from evaluate
        if ('error' in result) {
          return createErrorResponse(result.error);
        }

        // Format compact text output
        const lines: string[] = [];
        const {
          target,
          children,
          stats,
          layoutPattern,
          elementCounts,
          interactiveCounts,
          treeCounts,
          targetSemantic,
          deepPreview,
        } = result;

        // Add selection warning if multiple elements matched
        const selectionWarning = this.formatElementSelectionInfo(
          args.selector || 'body',
          elementIndex,
          totalCount,
          true
        );
        if (selectionWarning) {
          lines.push(selectionWarning.trimEnd());
        }

        // Header
        lines.push(`DOM Inspection: <${target.tag}${target.selector ? ' ' + target.selector : ''}>`);
        lines.push(
          `@ (${target.position.x},${target.position.y}) ${target.position.width}x${target.position.height}px`
        );
        const targetStatusParts: string[] = [];
        targetStatusParts.push(target.isVisible ? '✓ visible' : '✗ hidden');
        if (targetSemantic?.isInteractive) targetStatusParts.push('⚡ interactive');
        if (targetSemantic?.isSemantic) targetStatusParts.push('semantic element');
        if (targetSemantic?.testId) targetStatusParts.push(`testid=${targetSemantic.testId}`);
        if (targetSemantic?.role) targetStatusParts.push(`role=${targetSemantic.role}`);
        if (targetStatusParts.length > 0) {
          lines.push(`State: ${targetStatusParts.join(', ')}`);
        }
        if (targetSemantic?.text) {
          lines.push(`Text: "${targetSemantic.text}"`);
        }
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
          const wrapperNote =
            stats.skippedWrappers > 0
              ? ` (skipped ${stats.skippedWrappers} wrapper${stats.skippedWrappers === 1 ? '' : 's'})`
              : '';
          lines.push(`Children (0 semantic${wrapperNote}):`);
          lines.push('');

          if (targetSemantic?.isSemantic || targetSemantic?.isInteractive) {
            lines.push(
              `Target element is already semantic${targetSemantic.isInteractive ? ' and interactive' : ''}; no semantic descendants surfaced within maxDepth=${maxDepth}.`
            );
            lines.push('');
          }

          // Show interactive element summary if available
          const interactiveSummaryKeys = Object.keys(interactiveCounts);
          if (interactiveSummaryKeys.length > 0) {
            lines.push('Interactive elements exist deeper in the tree:');
            const interactiveTypes = ['button', 'a', 'input', 'select', 'textarea'];
            interactiveTypes.forEach(tag => {
              const count = interactiveCounts[tag] || 0;
              if (count > 0) {
                const label = tag === 'a' ? 'link' : tag;
                lines.push(`  • ${count} ${label}${count > 1 ? 's' : ''}`);
              }
            });
            lines.push('  • Increase maxDepth or drill down with more specific selectors.');
            lines.push('');
          } else {
            lines.push('⚠ No semantic or interactive descendants surfaced at this level.');
            lines.push('   Likely dominated by anonymous <div> wrappers without ARIA roles or test IDs.');
            lines.push('');
          }

          if (deepPreview && deepPreview.length > 0) {
            lines.push(`Deep preview (first ${deepPreview.length} semantic candidates past maxDepth):`);
            deepPreview.forEach((candidate, idx) => {
              const label = candidate.testId
                ? `<${candidate.tag} data-testid="${candidate.testId}">`
                : `<${candidate.tag}${candidate.selector ? ' ' + candidate.selector : ''}>`;
              lines.push(
                `  • depth ${candidate.depth}: ${label}`
              );

              const statusParts: string[] = [];
              statusParts.push(candidate.isVisible ? '✓ visible' : '✗ hidden');
              if (candidate.isInteractive) statusParts.push('⚡ interactive');
              if (candidate.scrollable) {
                const scrollIcons: string[] = [];
                if (candidate.scrollable.vertical) scrollIcons.push(`↕️ ${candidate.scrollable.overflowY}px`);
                if (candidate.scrollable.horizontal) scrollIcons.push(`↔️ ${candidate.scrollable.overflowX}px`);
                statusParts.push(`scrollable ${scrollIcons.join(' ')}`);
              }
              if (candidate.role) statusParts.push(`role=${candidate.role}`);
              if (candidate.childCount > 0) statusParts.push(`${candidate.childCount} children`);
              lines.push(`    ${statusParts.join(', ')}`);

              if (candidate.areaRatio !== null && candidate.areaRatio !== undefined) {
                const pct = Math.round(candidate.areaRatio * 100);
                lines.push(`    size ≈ ${pct}% of parent area`);
                if (pct > 0 && pct < 35) {
                  lines.push('    ↘ Large wrapper detected: child occupies a small portion of the container.');
                }
              }

              if (candidate.text) {
                lines.push(`    "${candidate.text}"`);
              }

              const suggestedSelector = candidate.testId
                ? `testid:${candidate.testId}`
                : candidate.selector;
              const recommendedDepth = Math.max(maxDepth + 3, candidate.depth + 1);
              lines.push(
                `    Try: inspect_dom({ selector: "${suggestedSelector}", maxDepth: ${recommendedDepth} })`
              );
            });
            lines.push('');
          } else if (stats.skippedWrappers > 0) {
            lines.push(`💡 Increase maxDepth (e.g., ${maxDepth + 3}) to drill through wrapper divs.`);
            lines.push('');
          }

          lines.push('Next steps:');
          const currentSelector = args.selector || 'body';
          lines.push(
            `1. Re-run inspect_dom({ selector: "${currentSelector}", maxDepth: ${Math.max(maxDepth + 3, 8)} }) to include deeper children`
          );
          lines.push(
            `2. Use get_visible_html({ selector: "${currentSelector}" }) when structure remains opaque`
          );
          lines.push('3. Add data-testid attributes or semantic tags to reduce wrapper skipping');

          if (
            treeCounts &&
            interactiveSummaryKeys.length === 0 &&
            Object.keys(treeCounts.interactiveCounts).length > 0
          ) {
            lines.push('');
            lines.push('Selectors to surface known interactive elements:');
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
            if (child.scrollable) {
              const scrollIcons: string[] = [];
              if (child.scrollable.vertical) scrollIcons.push(`↕️ ${child.scrollable.overflowY}px`);
              if (child.scrollable.horizontal) scrollIcons.push(`↔️ ${child.scrollable.overflowX}px`);
              statusParts.push(`scrollable ${scrollIcons.join(' ')}`);
            }
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
          if (stats.skippedWrappers >= 3 && stats.semanticCount > 0) {
            lines.push('');
            const wrapperLabel = stats.skippedWrappers === 1 ? 'wrapper container was' : 'wrapper containers were';
            lines.push(`💡 Tip: Some elements found, but ${stats.skippedWrappers} ${wrapperLabel} skipped.`);
            lines.push('   Consider adding test IDs to key elements for easier selection.');
          }

          // Suggest inspect_ancestors when drilling through many wrappers
          if (stats.skippedWrappers >= 6) {
            lines.push('');
            const wrapperSummary = stats.skippedWrappers === 1 ? 'wrapper container' : 'wrapper containers';
            lines.push(`💡 Lots of ${wrapperSummary} (${stats.skippedWrappers}). To inspect parent constraints:`);
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
