import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';

/**
 * Interface for test ID discovery results
 */
interface TestIdDiscoveryResult {
  totalCount: number;
  byAttribute: {
    [attribute: string]: string[];
  };
  duplicates: {
    [attribute: string]: {
      [value: string]: number;
    };
  };
}

/**
 * Tool for discovering all test identifiers on the page
 * Returns compact text format showing all data-testid, data-test, data-cy attributes
 */
export class GetTestIdsTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "get_test_ids",
      description: "Discover all test identifiers on the page (data-testid, data-test, data-cy, etc.). Returns a compact text list grouped by attribute type. Essential for test-driven workflows and understanding what elements can be reliably selected. Use the returned test IDs with selector shortcuts like 'testid:submit-button'.",
      inputSchema: {
        type: "object",
        properties: {
          attributes: {
            type: "string",
            description: "Comma-separated list of test ID attributes to search for (default: 'data-testid,data-test,data-cy')"
          },
          showAll: {
            type: "boolean",
            description: "If true, display all test IDs without truncation. If false (default), shows first 8 test IDs per attribute with a summary for longer lists."
          }
        },
        required: [],
      },
    };
  }

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
          const duplicates: { [key: string]: { [value: string]: number } } = {};
          let totalCount = 0;

          attrs.forEach((attr) => {
            const elements = document.querySelectorAll(`[${attr}]`);
            const values: string[] = [];
            const counts: { [value: string]: number } = {};

            elements.forEach((el) => {
              const value = el.getAttribute(attr);
              if (value) {
                values.push(value);
                totalCount++;

                // Track duplicates
                counts[value] = (counts[value] || 0) + 1;
              }
            });

            if (values.length > 0) {
              byAttribute[attr] = values;

              // Store duplicates (values that appear more than once)
              const attrDuplicates: { [value: string]: number } = {};
              Object.entries(counts).forEach(([value, count]) => {
                if (count > 1) {
                  attrDuplicates[value] = count;
                }
              });

              if (Object.keys(attrDuplicates).length > 0) {
                duplicates[attr] = attrDuplicates;
              }
            }
          });

          return {
            totalCount,
            byAttribute,
            duplicates,
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
          lines.push('  - Use inspect_dom to see page structure');
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

          // Add duplicate warnings
          const hasDuplicates = Object.keys(discoveryData.duplicates).length > 0;
          if (hasDuplicates) {
            lines.push('⚠ Warning: Duplicate test IDs found (test IDs should be unique):');
            lines.push('');

            Object.entries(discoveryData.duplicates).forEach(([attr, dups]) => {
              Object.entries(dups).forEach(([value, count]) => {
                lines.push(`  ${attr}: "${value}" appears ${count} times`);
              });
            });

            lines.push('');
            lines.push('⚠ Impact of Duplicate Test IDs:');
            lines.push('   - Flaky tests (selectors match multiple elements)');
            lines.push('   - Ambiguous interactions (which element to click?)');
            lines.push('   - Test automation will fail or behave unpredictably');
            lines.push('');
            lines.push('🔧 How to Fix:');
            lines.push('   1. Use query_selector_all to locate all duplicates');

            // Add example for the first duplicate
            const firstDupAttr = Object.keys(discoveryData.duplicates)[0];
            const firstDupValue = Object.keys(discoveryData.duplicates[firstDupAttr])[0];
            const firstDupCount = discoveryData.duplicates[firstDupAttr][firstDupValue];

            if (firstDupAttr === 'data-testid') {
              lines.push(`      query_selector_all({ selector: "testid:${firstDupValue}" })`);
            } else {
              lines.push(`      query_selector_all({ selector: "[${firstDupAttr}='${firstDupValue}']" })`);
            }

            lines.push('   2. Identify which elements should keep the test ID');
            lines.push('   3. Rename duplicates to be unique and descriptive');
            lines.push(`      Example: "${firstDupValue}" → "${firstDupValue}-primary", "${firstDupValue}-mobile"`);
            lines.push('   4. If one is hidden/unused, consider removing it entirely');
            lines.push('');
            lines.push('💡 Best Practice: Test IDs must be unique across the entire page');
            lines.push('');
          }

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
