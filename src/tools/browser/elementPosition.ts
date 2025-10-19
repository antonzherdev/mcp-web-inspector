import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Tool for getting element position and size
 */
export class ElementPositionTool extends BrowserToolBase {
  /**
   * Execute the element position tool
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

        // Get bounding box
        const boundingBox = await locator.boundingBox();

        if (!boundingBox) {
          return createErrorResponse(`Element has no bounding box (might be hidden or have display:none): ${args.selector}`);
        }

        // Check if in viewport and get element tag info
        const elementData = await locator.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          // Element is in viewport if any part is visible
          const inViewport = (
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < viewportHeight &&
            rect.left < viewportWidth
          );

          // Build element descriptor
          const tagName = element.tagName.toLowerCase();
          const testId = element.getAttribute('data-testid') || element.getAttribute('data-test') || element.getAttribute('data-cy');
          const id = element.id ? `#${element.id}` : '';
          const classes = element.className && typeof element.className === 'string' ? `.${element.className.split(' ').filter(c => c).join('.')}` : '';

          let descriptor = `<${tagName}`;
          if (testId) descriptor += ` data-testid="${testId}"`;
          else if (id) descriptor += id;
          else if (classes) descriptor += classes;
          descriptor += '>';

          return { inViewport, descriptor };
        });

        // Build compact text format
        const x = Math.round(boundingBox.x);
        const y = Math.round(boundingBox.y);
        const width = Math.round(boundingBox.width);
        const height = Math.round(boundingBox.height);

        const viewportSymbol = elementData.inViewport ? '✓' : '✗';
        const viewportStatus = elementData.inViewport ? 'in viewport' : 'outside viewport';

        const output = `Position: ${elementData.descriptor}\n@ (${x},${y}) ${width}x${height}px, ${viewportSymbol} ${viewportStatus}`;

        return createSuccessResponse(output);
      } catch (error) {
        return createErrorResponse(`Failed to get position: ${(error as Error).message}`);
      }
    });
  }
}
