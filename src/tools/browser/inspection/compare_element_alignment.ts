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
      outputs: [
        "Optional warnings when a selector matched multiple elements (uses first visible; suggests adding unique data-testid).",
        "Header: Alignment: <elem1> vs <elem2>",
        "Two lines with each element's position and size: @ (x,y) w×h px",
        "Edges block: Top/Left/Right/Bottom with ✓/✗ and diffs",
        "Centers block: Horizontal/Vertical center alignment with ✓/✗ and diffs",
        "Dimensions block: Width/Height same or different with ✓/✗ and diffs",
        "Optional hint to run inspect_ancestors(...) when large misalignment detected",
      ],
      examples: [
        "compare_element_alignment({ selector1: 'testid:header-title', selector2: 'testid:subtitle' })",
        "compare_element_alignment({ selector1: '#left-panel', selector2: '#right-panel' })",
      ],
      priority: 2,
      exampleOutputs: [
        {
          call: "compare_element_alignment({ selector1: '#left-panel', selector2: '#right-panel' })",
          output: `Alignment: <div #left-panel> vs <div #right-panel>\n  #left-panel: @ (80,120) 320×600px\n  #right-panel: @ (440,120) 320×600px\n\nEdges:\n  Top:    ✓ aligned (both @ 120px)\n  Left:   ✗ not aligned (80px vs 440px, diff: 360px)\n  Right:  ✗ not aligned (400px vs 760px, diff: 360px)\n  Bottom: ✓ aligned (both @ 720px)\n\nCenters:\n  Horizontal: ✗ not aligned (240px vs 600px, diff: 360px)\n  Vertical:   ✓ aligned (both @ 420px)\n\nDimensions:\n  Width:  ✓ same (320px)\n  Height: ✓ same (600px)`
        }
      ],
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
        // Build locators for both elements
        const locator1 = page.locator(selector1);
        const locator2 = page.locator(selector2);

        // Check existence first to preserve legacy error messages expected by tests
        const count1 = await locator1.count();
        const count2 = await locator2.count();

        if (count1 === 0) {
          return createErrorResponse(`First element not found: ${args.selector1}`);
        }
        if (count2 === 0) {
          return createErrorResponse(`Second element not found: ${args.selector2}`);
        }

        // Prefer first visible element and produce clear selection info
        let selectionWarning1 = '';
        let selectionWarning2 = '';

        let targetLocator1 = locator1.first();
        let targetLocator2 = locator2.first();

        try {
          const sel1 = await this.selectPreferredLocator(locator1, {
            originalSelector: args.selector1,
          });
          selectionWarning1 = this.formatElementSelectionInfo(
            args.selector1,
            sel1.elementIndex,
            sel1.totalCount,
          );
          targetLocator1 = sel1.element;
        } catch {
          // Fallback to first() when visibility checks are unavailable (tests/mocks)
          selectionWarning1 = this.formatElementSelectionInfo(
            args.selector1,
            0,
            count1,
          );
        }

        try {
          const sel2 = await this.selectPreferredLocator(locator2, {
            originalSelector: args.selector2,
          });
          selectionWarning2 = this.formatElementSelectionInfo(
            args.selector2,
            sel2.elementIndex,
            sel2.totalCount,
          );
          targetLocator2 = sel2.element;
        } catch {
          selectionWarning2 = this.formatElementSelectionInfo(
            args.selector2,
            0,
            count2,
          );
        }

        // Maintain legacy warning format for multiple matches, then append richer hints
        let legacyWarnings = '';
        if (count1 > 1) {
          legacyWarnings += `⚠ Warning: First selector matched ${count1} elements, using first\n`;
        }
        if (count2 > 1) {
          legacyWarnings += `⚠ Warning: Second selector matched ${count2} elements, using first\n`;
        }
        const warnings = [legacyWarnings.trimEnd(), selectionWarning1, selectionWarning2]
          .filter(Boolean)
          .join('\n');

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
          warnings ? `${warnings}\n` : '',
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
