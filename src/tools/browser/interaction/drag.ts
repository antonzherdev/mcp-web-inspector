import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';

/**
 * Tool for dragging elements on the page
 */
export class DragTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "drag",
      description: "Drag an element to a target location",
      inputSchema: {
        type: "object",
        properties: {
          sourceSelector: { type: "string", description: "CSS selector for the element to drag" },
          targetSelector: { type: "string", description: "CSS selector for the target location" }
        },
        required: ["sourceSelector", "targetSelector"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const normalizedSource = this.normalizeSelector(args.sourceSelector);
      const normalizedTarget = this.normalizeSelector(args.targetSelector);

      // Use standard element selection with error on multiple matches
      const sourceLocator = page.locator(normalizedSource);
      const { element: sourceElement } = await this.selectPreferredLocator(sourceLocator, {
        errorOnMultiple: true,
        originalSelector: args.sourceSelector,
      });

      const targetLocator = page.locator(normalizedTarget);
      const { element: targetElement } = await this.selectPreferredLocator(targetLocator, {
        errorOnMultiple: true,
        originalSelector: args.targetSelector,
      });

      const sourceBound = await sourceElement.boundingBox();
      const targetBound = await targetElement.boundingBox();

      if (!sourceBound || !targetBound) {
        return createErrorResponse("Could not get element positions for drag operation");
      }

      await page.mouse.move(
        sourceBound.x + sourceBound.width / 2,
        sourceBound.y + sourceBound.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        targetBound.x + targetBound.width / 2,
        targetBound.y + targetBound.height / 2
      );
      await page.mouse.up();

      return createSuccessResponse(`Dragged element from ${args.sourceSelector} to ${args.targetSelector}`);
    });
  }
}
