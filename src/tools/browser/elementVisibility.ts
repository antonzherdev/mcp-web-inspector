import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Tool for checking element visibility with detailed diagnostics
 * Addresses the #1 debugging pain point: "Why won't it click?"
 */
export class ElementVisibilityTool extends BrowserToolBase {
  /**
   * Execute the element visibility tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      const locator = page.locator(selector);

      try {
        // Check if element exists
        const count = await locator.count();
        if (count === 0) {
          return createErrorResponse(`Element not found: ${args.selector}`);
        }

        // Get basic visibility (Playwright's isVisible)
        const isVisible = await locator.isVisible();

        // Evaluate detailed visibility information in browser context
        const visibilityData = await locator.evaluate((element) => {
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

          // Check if covered by another element (check center point)
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const topElement = document.elementFromPoint(centerX, centerY);
          const isCovered = topElement !== element && !element.contains(topElement);

          return {
            viewportRatio,
            isInViewport,
            opacity,
            display,
            visibility,
            isClipped,
            isCovered,
          };
        });

        // Determine if scroll is needed
        const needsScroll = isVisible && !visibilityData.isInViewport;

        // Get element tag name for output
        const tagInfo = await locator.evaluate((el) => {
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
        let output = `Visibility: ${tagInfo}\n\n`;

        // Status line
        const visibleSymbol = isVisible ? '✓' : '✗';
        const viewportSymbol = visibilityData.isInViewport ? '✓' : '✗';
        const viewportText = visibilityData.isInViewport
          ? `in viewport${viewportPercent < 100 ? ` (${viewportPercent}% visible)` : ''}`
          : `not in viewport${viewportPercent > 0 ? ` (${viewportPercent}% visible)` : ''}`;
        output += `${visibleSymbol} ${isVisible ? 'visible' : 'hidden'}, ${viewportSymbol} ${viewportText}\n`;

        // CSS properties
        output += `opacity: ${visibilityData.opacity}, display: ${visibilityData.display}, visibility: ${visibilityData.visibility}\n`;

        // Issues section
        const issues: string[] = [];
        if (visibilityData.isClipped) {
          issues.push('  ✗ clipped by parent overflow:hidden');
        }
        if (visibilityData.isCovered) {
          issues.push('  ✗ covered by another element');
        }
        if (needsScroll) {
          issues.push('  ⚠ needs scroll to bring into view');
        }

        if (issues.length > 0) {
          output += '\nIssues:\n';
          output += issues.join('\n') + '\n';
        }

        // Suggestion
        if (needsScroll) {
          output += '\n→ Call playwright_scroll_to_element before clicking';
        }

        return createSuccessResponse(output.trim());
      } catch (error) {
        return createErrorResponse(`Failed to check visibility: ${(error as Error).message}`);
      }
    });
  }
}
