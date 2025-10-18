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

        // Check if in viewport
        const inViewport = await locator.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          // Element is in viewport if any part is visible
          return (
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < viewportHeight &&
            rect.left < viewportWidth
          );
        });

        const result = {
          x: Math.round(boundingBox.x),
          y: Math.round(boundingBox.y),
          width: Math.round(boundingBox.width),
          height: Math.round(boundingBox.height),
          inViewport,
        };

        return createSuccessResponse(JSON.stringify(result, null, 2));
      } catch (error) {
        return createErrorResponse(`Failed to get position: ${(error as Error).message}`);
      }
    });
  }
}
