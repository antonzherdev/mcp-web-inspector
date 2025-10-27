import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';

/**
 * Tool for comparing alignment of two elements
 */
export class CompareElementAlignmentTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "compare_element_alignment",
      description: "COMPARE TWO ELEMENTS: Get comprehensive alignment and dimension comparison in one call. Shows edge alignment (top, left, right, bottom), center alignment (horizontal, vertical), and dimensions (width, height). Perfect for debugging 'are these headers aligned?' or 'do these panels match?'. Returns all alignment info with ✓/✗ symbols and pixel differences. For parent-child centering, use inspect_dom() instead (automatically shows if children are centered in parent). More efficient than evaluate() with manual getBoundingClientRect() calculations.",
      inputSchema: {
        type: "object",
        properties: {
          selector1: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand for the first element (e.g., 'testid:main-header', '#header')"
          },
          selector2: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand for the second element (e.g., 'testid:chat-header', '#secondary-header')"
          }
        },
        required: ["selector1", "selector2"],
      },
    };
  }

  /**
   * Execute the compare element alignment tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector1 = this.normalizeSelector(args.selector1);
      const selector2 = this.normalizeSelector(args.selector2);

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

        // Calculate all alignment values
        const tolerance = 2; // Allow 2px tolerance for rounding

        // Edge positions
        const top1 = Math.round(box1.y);
        const top2 = Math.round(box2.y);
        const topDiff = Math.abs(top1 - top2);
        const topAligned = topDiff <= tolerance;

        const left1 = Math.round(box1.x);
        const left2 = Math.round(box2.x);
        const leftDiff = Math.abs(left1 - left2);
        const leftAligned = leftDiff <= tolerance;

        const right1 = Math.round(box1.x + box1.width);
        const right2 = Math.round(box2.x + box2.width);
        const rightDiff = Math.abs(right1 - right2);
        const rightAligned = rightDiff <= tolerance;

        const bottom1 = Math.round(box1.y + box1.height);
        const bottom2 = Math.round(box2.y + box2.height);
        const bottomDiff = Math.abs(bottom1 - bottom2);
        const bottomAligned = bottomDiff <= tolerance;

        // Center positions
        const centerH1 = Math.round(box1.x + box1.width / 2);
        const centerH2 = Math.round(box2.x + box2.width / 2);
        const centerHDiff = Math.abs(centerH1 - centerH2);
        const centerHAligned = centerHDiff <= tolerance;

        const centerV1 = Math.round(box1.y + box1.height / 2);
        const centerV2 = Math.round(box2.y + box2.height / 2);
        const centerVDiff = Math.abs(centerV1 - centerV2);
        const centerVAligned = centerVDiff <= tolerance;

        // Dimensions
        const width1 = Math.round(box1.width);
        const width2 = Math.round(box2.width);
        const widthDiff = Math.abs(width1 - width2);
        const widthSame = widthDiff <= tolerance;

        const height1 = Math.round(box1.height);
        const height2 = Math.round(box2.height);
        const heightDiff = Math.abs(height1 - height2);
        const heightSame = heightDiff <= tolerance;

        // Format compact output
        const formatAlignment = (aligned: boolean, val1: number, val2: number, diff: number, unit: string = 'px') => {
          const symbol = aligned ? '✓' : '✗';
          const status = aligned ? 'aligned' : 'not aligned';
          if (aligned) {
            return `${symbol} ${status} (both @ ${val1}${unit})`;
          } else {
            return `${symbol} ${status} (${val1}${unit} vs ${val2}${unit}, diff: ${diff}${unit})`;
          }
        };

        const formatDimension = (same: boolean, val1: number, val2: number, diff: number, unit: string = 'px') => {
          const symbol = same ? '✓' : '✗';
          const status = same ? 'same' : 'different';
          if (same) {
            return `${symbol} ${status} (${val1}${unit})`;
          } else {
            return `${symbol} ${status} (${val1}${unit} vs ${val2}${unit}, diff: ${diff}${unit})`;
          }
        };

        // Build output
        const lines = [
          warnings,
          `Alignment: ${descriptor1} vs ${descriptor2}`,
          `  ${name1}: @ (${left1},${top1}) ${width1}×${height1}px`,
          `  ${name2}: @ (${left2},${top2}) ${width2}×${height2}px`,
          '',
          'Edges:',
          `  Top:    ${formatAlignment(topAligned, top1, top2, topDiff)}`,
          `  Left:   ${formatAlignment(leftAligned, left1, left2, leftDiff)}`,
          `  Right:  ${formatAlignment(rightAligned, right1, right2, rightDiff)}`,
          `  Bottom: ${formatAlignment(bottomAligned, bottom1, bottom2, bottomDiff)}`,
          '',
          'Centers:',
          `  Horizontal: ${formatAlignment(centerHAligned, centerH1, centerH2, centerHDiff)}`,
          `  Vertical:   ${formatAlignment(centerVAligned, centerV1, centerV2, centerVDiff)}`,
          '',
          'Dimensions:',
          `  Width:  ${formatDimension(widthSame, width1, width2, widthDiff)}`,
          `  Height: ${formatDimension(heightSame, height1, height2, heightDiff)}`
        ];

        // Suggest inspect_ancestors if alignment is off and differences are significant
        const hasSignificantDifference = Math.abs(topDiff) > 5 || Math.abs(leftDiff) > 5 || Math.abs(rightDiff) > 5;
        const isNotAligned = !topAligned && !leftAligned && !rightAligned && !bottomAligned;

        if (isNotAligned && hasSignificantDifference) {
          lines.push('');
          lines.push('💡 Alignment issue detected. Check if parent layout affects positioning:');
          lines.push(`   inspect_ancestors({ selector: "${args.selector1}" })`);
          lines.push(`   inspect_ancestors({ selector: "${args.selector2}" })`);
        }

        return createSuccessResponse(lines.filter(l => l !== undefined).join('\n'));
      } catch (error) {
        return createErrorResponse(`Failed to compare element alignment: ${(error as Error).message}`);
      }
    });
  }
}
