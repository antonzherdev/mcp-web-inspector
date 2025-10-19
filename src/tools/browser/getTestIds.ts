import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Interface for test ID discovery results
 */
interface TestIdDiscoveryResult {
  totalCount: number;
  byAttribute: {
    [attribute: string]: string[];
  };
}

/**
 * Tool for discovering all test identifiers on the page
 * Returns compact text format showing all data-testid, data-test, data-cy attributes
 */
export class GetTestIdsTool extends BrowserToolBase {
  /**
   * Execute the test ID discovery tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const attributes = args.attributes
        ? args.attributes.split(',').map((a: string) => a.trim())
        : ['data-testid', 'data-test', 'data-cy'];
      const showAll = args.showAll === true;

      try {
        // Discover all test IDs on the page
        const discoveryData = await page.evaluate((attrs: string[]) => {
          const byAttribute: { [key: string]: string[] } = {};
          let totalCount = 0;

          attrs.forEach((attr) => {
            const elements = document.querySelectorAll(`[${attr}]`);
            const values: string[] = [];

            elements.forEach((el) => {
              const value = el.getAttribute(attr);
              if (value) {
                values.push(value);
                totalCount++;
              }
            });

            if (values.length > 0) {
              byAttribute[attr] = values;
            }
          });

          return {
            totalCount,
            byAttribute,
          };
        }, attributes);

        // Format compact text output
        const lines: string[] = [];

        if (discoveryData.totalCount === 0) {
          lines.push('Found 0 test IDs');
          lines.push('');
          lines.push('⚠ No test ID attributes found on this page.');
          lines.push('');
          lines.push('Searched for:');
          attributes.forEach((attr) => {
            lines.push(`  • ${attr}`);
          });
          lines.push('');
          lines.push('Suggestions:');
          lines.push('  - Use playwright_inspect_dom to see page structure');
          lines.push('  - Consider adding test IDs to interactive elements');
          lines.push('  - Example: <button data-testid="submit-button">Submit</button>');
        } else {
          lines.push(`Found ${discoveryData.totalCount} test ID${discoveryData.totalCount > 1 ? 's' : ''}:`);
          lines.push('');

          // Group by attribute type
          Object.entries(discoveryData.byAttribute).forEach(([attr, values]) => {
            lines.push(`${attr} (${values.length}):`);

            // Format values in a compact way
            if (showAll || values.length <= 10) {
              // Show all if requested or if 10 or fewer
              lines.push(`  ${values.join(', ')}`);
            } else {
              // Show first 8, then indicate more
              const shown = values.slice(0, 8);
              const remaining = values.length - 8;
              lines.push(`  ${shown.join(', ')},`);
              lines.push(`  ... and ${remaining} more`);
              lines.push(`  💡 Use showAll: true to see all ${values.length} test IDs`);
            }

            lines.push('');
          });

          // Add usage tip
          lines.push('💡 Tip: Use these test IDs with selector shortcuts:');
          const firstAttr = Object.keys(discoveryData.byAttribute)[0];
          const firstValue = discoveryData.byAttribute[firstAttr][0];

          if (firstAttr === 'data-testid') {
            lines.push(`   testid:${firstValue} → [data-testid="${firstValue}"]`);
          } else {
            lines.push(`   ${firstAttr}:${firstValue} → [${firstAttr}="${firstValue}"]`);
          }
        }

        return createSuccessResponse(lines.join('\n'));
      } catch (error) {
        return createErrorResponse(`Failed to discover test IDs: ${(error as Error).message}`);
      }
    });
  }
}
