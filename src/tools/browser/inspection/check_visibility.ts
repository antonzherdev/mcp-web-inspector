import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';

/**
 * Tool for checking element visibility with detailed diagnostics
 * Addresses the #1 debugging pain point: "Why won't it click?"
 */
export class CheckVisibilityTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "check_visibility",
      description: "Check if an element is visible to the user. CRITICAL for debugging click/interaction failures. Returns detailed visibility information including viewport intersection, clipping by overflow:hidden, and whether element needs scrolling. Supports testid shortcuts (e.g., 'testid:submit-button').",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand (e.g., 'testid:login-button', '#submit', 'text=Click here')"
          },
          elementIndex: {
            type: "number",
            description: "When selector matches multiple elements, use this 1-based index to select a specific one (e.g., 2 = second element). Default: first visible element."
          }
        },
        required: ["selector"],
      },
    };
  }

  /**
   * Execute the element visibility tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      const locator = page.locator(selector);

      try {
        // Use standard element selection with visibility preference
        const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator, {
          elementIndex: args.elementIndex,
          originalSelector: args.selector,
        });

        // Format selection warning if multiple elements matched
        const multipleMatchWarning = this.formatElementSelectionInfo(
          args.selector,
          elementIndex,
          totalCount
        );

        // Get basic visibility (Playwright's isVisible)
        const isVisible = await element.isVisible();

        // Evaluate detailed visibility information in browser context
        const visibilityData = await element.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          // Calculate viewport intersection ratio
          const visibleTop = Math.max(0, rect.top);
          const visibleBottom = Math.min(viewportHeight, rect.bottom);
          const visibleLeft = Math.max(0, rect.left);
          const visibleRight = Math.min(viewportWidth, rect.right);

          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          const visibleWidth = Math.max(0, visibleRight - visibleLeft);
          const visibleArea = visibleHeight * visibleWidth;

          const totalArea = rect.height * rect.width;
          const viewportRatio = totalArea > 0 ? visibleArea / totalArea : 0;

          // Check if element is in viewport
          const isInViewport = viewportRatio > 0;

          // Get computed styles
          const styles = window.getComputedStyle(element);
          const opacity = parseFloat(styles.opacity);
          const display = styles.display;
          const visibility = styles.visibility;

          // Check if clipped by overflow:hidden
          let isClipped = false;
          let parent = element.parentElement;
          while (parent) {
            const parentStyle = window.getComputedStyle(parent);
            if (
              parentStyle.overflow === 'hidden' ||
              parentStyle.overflowX === 'hidden' ||
              parentStyle.overflowY === 'hidden'
            ) {
              const parentRect = parent.getBoundingClientRect();
              // Check if element is outside parent bounds
              if (
                rect.right < parentRect.left ||
                rect.left > parentRect.right ||
                rect.bottom < parentRect.top ||
                rect.top > parentRect.bottom
              ) {
                isClipped = true;
                break;
              }
            }
            parent = parent.parentElement;
          }

          // Check if covered by another element (check center point and corners)
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const topElement = document.elementFromPoint(centerX, centerY);
          const isCovered = topElement !== element && !element.contains(topElement);

          // Get covering element info if covered
          let coveringElementInfo = '';
          let coveragePercent = 0;
          if (isCovered && topElement) {
            const coveringTagName = topElement.tagName.toLowerCase();
            const coveringTestId = topElement.getAttribute('data-testid');
            const coveringId = topElement.id ? `#${topElement.id}` : '';
            const coveringClasses = topElement.className && typeof topElement.className === 'string'
              ? `.${(topElement.className as string).split(' ').filter((c: string) => c).slice(0, 2).join('.')}`
              : '';

            const coveringStyles = window.getComputedStyle(topElement);
            const zIndex = coveringStyles.zIndex;

            let descriptor = `<${coveringTagName}`;
            if (coveringTestId) descriptor += ` data-testid="${coveringTestId}"`;
            else if (coveringId) descriptor += coveringId;
            else if (coveringClasses) descriptor += coveringClasses;
            descriptor += `> (z-index: ${zIndex})`;

            coveringElementInfo = descriptor;

            // Calculate approximate coverage by checking multiple points
            const samplePoints = [
              [centerX, centerY],
              [rect.left + rect.width * 0.25, rect.top + rect.height * 0.25],
              [rect.left + rect.width * 0.75, rect.top + rect.height * 0.25],
              [rect.left + rect.width * 0.25, rect.top + rect.height * 0.75],
              [rect.left + rect.width * 0.75, rect.top + rect.height * 0.75],
            ];

            let coveredPoints = 0;
            samplePoints.forEach(([x, y]) => {
              const pointElement = document.elementFromPoint(x, y);
              if (pointElement !== element && !element.contains(pointElement)) {
                coveredPoints++;
              }
            });

            coveragePercent = Math.round((coveredPoints / samplePoints.length) * 100);
          }

          // Check interactability
          const computedStyles = window.getComputedStyle(element);
          const pointerEvents = computedStyles.pointerEvents;
          const isDisabled = (element as HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement).disabled || false;
          const isReadonly = (element as HTMLInputElement | HTMLTextAreaElement).readOnly || false;
          const ariaDisabled = element.getAttribute('aria-disabled') === 'true';

          return {
            viewportRatio,
            isInViewport,
            opacity,
            display,
            visibility,
            isClipped,
            isCovered,
            coveringElementInfo,
            coveragePercent,
            pointerEvents,
            isDisabled,
            isReadonly,
            ariaDisabled,
          };
        });

        // Determine if scroll is needed
        const needsScroll = isVisible && !visibilityData.isInViewport;

        // Get element tag name for output
        const tagInfo = await element.evaluate((el) => {
          const tagName = el.tagName.toLowerCase();
          const testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-cy');
          const id = el.id ? `#${el.id}` : '';
          const classes = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').filter(c => c).join('.')}` : '';

          let descriptor = `<${tagName}`;
          if (testId) descriptor += ` data-testid="${testId}"`;
          else if (id) descriptor += id;
          else if (classes) descriptor += classes;
          descriptor += '>';

          return descriptor;
        });

        // Build compact text format
        const viewportPercent = Math.round(visibilityData.viewportRatio * 100);
        let output = multipleMatchWarning + `Visibility: ${tagInfo}\n\n`;

        // Status line
        const visibleSymbol = isVisible ? '✓' : '✗';
        const viewportSymbol = visibilityData.isInViewport ? '✓' : '✗';
        const viewportText = visibilityData.isInViewport
          ? `in viewport${viewportPercent < 100 ? ` (${viewportPercent}% visible)` : ''}`
          : `not in viewport${viewportPercent > 0 ? ` (${viewportPercent}% visible)` : ''}`;
        output += `${visibleSymbol} ${isVisible ? 'visible' : 'hidden'}, ${viewportSymbol} ${viewportText}\n`;

        // CSS properties
        output += `opacity: ${visibilityData.opacity}, display: ${visibilityData.display}, visibility: ${visibilityData.visibility}\n`;

        // Interactability section
        const interactabilityIssues: string[] = [];
        if (visibilityData.isDisabled) {
          interactabilityIssues.push('disabled');
        }
        if (visibilityData.isReadonly) {
          interactabilityIssues.push('readonly');
        }
        if (visibilityData.ariaDisabled) {
          interactabilityIssues.push('aria-disabled');
        }
        if (visibilityData.pointerEvents === 'none') {
          interactabilityIssues.push('pointer-events: none');
        }

        if (interactabilityIssues.length > 0) {
          output += `⚠ interactability: ${interactabilityIssues.join(', ')}\n`;
        }

        // Issues section
        const issues: string[] = [];
        if (visibilityData.isClipped) {
          issues.push('  ✗ clipped by parent overflow:hidden');
        }
        if (visibilityData.isCovered) {
          const coverageInfo = visibilityData.coveragePercent > 0
            ? ` (~${visibilityData.coveragePercent}% covered)`
            : '';
          issues.push(`  ✗ covered by another element${coverageInfo}`);
          if (visibilityData.coveringElementInfo) {
            issues.push(`    Covering: ${visibilityData.coveringElementInfo}`);
          }
        }
        if (needsScroll) {
          issues.push('  ⚠ needs scroll to bring into view');
        }

        if (issues.length > 0) {
          output += '\nIssues:\n';
          output += issues.join('\n') + '\n';
        }

        // Suggestions
        const suggestions: string[] = [];
        if (needsScroll) {
          suggestions.push('→ Call scroll_to_element before clicking');
        }
        if (visibilityData.isCovered) {
          suggestions.push('→ Element may be behind modal, overlay, or fixed header');
        }
        if (interactabilityIssues.length > 0) {
          suggestions.push('→ Element cannot be interacted with in current state');
        }

        if (suggestions.length > 0) {
          output += '\n' + suggestions.join('\n');
        }

        // Suggest inspect_ancestors if element is clipped
        if (visibilityData.isClipped) {
          output += '\n\n💡 Element clipped by parent. Find the clipping container:';
          output += `\n   inspect_ancestors({ selector: "${args.selector}" })`;
        }

        return createSuccessResponse(output.trim());
      } catch (error) {
        return createErrorResponse(`Failed to check visibility: ${(error as Error).message}`);
      }
    });
  }
}
