import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Tool for comparing positions and sizes of two elements
 */
export class ComparePositionsTool extends BrowserToolBase {
  /**
   * Execute the compare positions tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector1 = this.normalizeSelector(args.selector1);
      const selector2 = this.normalizeSelector(args.selector2);
      const checkAlignment = args.checkAlignment;

      // Validate checkAlignment parameter
      const validAlignments = ['top', 'left', 'right', 'bottom', 'width', 'height'];
      if (!validAlignments.includes(checkAlignment)) {
        return createErrorResponse(
          `Invalid checkAlignment value: "${checkAlignment}". Must be one of: ${validAlignments.join(', ')}`
        );
      }

      try {
        // Get locators for both elements
        const locator1 = page.locator(selector1);
        const locator2 = page.locator(selector2);

        // Check if both elements exist
        const count1 = await locator1.count();
        const count2 = await locator2.count();

        if (count1 === 0) {
          return createErrorResponse(`First element not found: ${args.selector1}`);
        }
        if (count2 === 0) {
          return createErrorResponse(`Second element not found: ${args.selector2}`);
        }

        // Handle multiple matches by using first() - show warning
        const targetLocator1 = count1 > 1 ? locator1.first() : locator1;
        const targetLocator2 = count2 > 1 ? locator2.first() : locator2;

        let warnings = '';
        if (count1 > 1) {
          warnings += `⚠ Warning: First selector matched ${count1} elements, using first\n`;
        }
        if (count2 > 1) {
          warnings += `⚠ Warning: Second selector matched ${count2} elements, using first\n`;
        }
        if (warnings) {
          warnings += '\n';
        }

        // Get bounding boxes
        const box1 = await targetLocator1.boundingBox();
        const box2 = await targetLocator2.boundingBox();

        // Get element descriptors
        const getDescriptor = async (locator: any) => {
          return await locator.evaluate((element: HTMLElement) => {
            const tagName = element.tagName.toLowerCase();
            const testId = element.getAttribute('data-testid') || element.getAttribute('data-test') || element.getAttribute('data-cy');
            const id = element.id ? `#${element.id}` : '';
            const classes = element.className && typeof element.className === 'string'
              ? `.${element.className.split(' ').filter(c => c).join('.')}`
              : '';

            let descriptor = `<${tagName}`;
            if (testId) descriptor += ` data-testid="${testId}"`;
            else if (id) descriptor += id;
            else if (classes) descriptor += classes;
            descriptor += '>';

            return descriptor;
          });
        };

        const descriptor1 = await getDescriptor(targetLocator1);
        const descriptor2 = await getDescriptor(targetLocator2);

        // Handle hidden elements
        if (!box1) {
          return createErrorResponse(`First element is hidden or has no dimensions: ${descriptor1}`);
        }
        if (!box2) {
          return createErrorResponse(`Second element is hidden or has no dimensions: ${descriptor2}`);
        }

        // Calculate values based on alignment type
        let value1: number;
        let value2: number;
        let label: string;
        let unit = 'px';

        switch (checkAlignment) {
          case 'top':
            value1 = Math.round(box1.y);
            value2 = Math.round(box2.y);
            label = 'Top';
            break;
          case 'left':
            value1 = Math.round(box1.x);
            value2 = Math.round(box2.x);
            label = 'Left';
            break;
          case 'right':
            value1 = Math.round(box1.x + box1.width);
            value2 = Math.round(box2.x + box2.width);
            label = 'Right';
            break;
          case 'bottom':
            value1 = Math.round(box1.y + box1.height);
            value2 = Math.round(box2.y + box2.height);
            label = 'Bottom';
            break;
          case 'width':
            value1 = Math.round(box1.width);
            value2 = Math.round(box2.width);
            label = 'Width';
            break;
          case 'height':
            value1 = Math.round(box1.height);
            value2 = Math.round(box2.height);
            label = 'Height';
            break;
          default:
            return createErrorResponse(`Unexpected alignment type: ${checkAlignment}`);
        }

        const difference = Math.abs(value1 - value2);
        const aligned = difference === 0;
        const alignmentSymbol = aligned ? '✓' : '✗';
        const alignmentStatus = aligned ? 'aligned' : 'not aligned';

        // Extract short name from descriptor for compact output
        const getShortName = (descriptor: string, selector: string) => {
          const testIdMatch = descriptor.match(/data-testid="([^"]+)"/);
          if (testIdMatch) return testIdMatch[1];

          const idMatch = descriptor.match(/#([^>]+)/);
          if (idMatch) return idMatch[1];

          // Use original selector if available
          return selector;
        };

        const name1 = getShortName(descriptor1, args.selector1);
        const name2 = getShortName(descriptor2, args.selector2);

        // Build compact text format
        const output = warnings +
          `Alignment Check:\n` +
          `${descriptor1} vs ${descriptor2}\n\n` +
          `${label}: ${alignmentSymbol} ${alignmentStatus}\n` +
          `  ${name1}: ${value1}${unit}\n` +
          `  ${name2}: ${value2}${unit}\n` +
          `  Difference: ${difference}${unit}`;

        return createSuccessResponse(output);
      } catch (error) {
        return createErrorResponse(`Failed to compare positions: ${(error as Error).message}`);
      }
    });
  }
}
