import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for executing JavaScript in the browser
 */
export class EvaluateTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "evaluate",
      description: "Execute JavaScript in the browser console. ⚠️ AVOID for common tasks - use specialized tools instead: inspect_dom() for page structure, compare_positions() for alignment, measure_element() for spacing, query_selector() for finding elements. Only use evaluate() for custom logic not covered by other tools.",
      inputSchema: {
        type: "object",
        properties: {
          script: { type: "string", description: "JavaScript code to execute" },
        },
        required: ["script"],
      },
    };
  }

  /**
   * Detect common patterns and suggest better tools
   */
  private detectBetterToolSuggestions(script: string): string[] {
    const suggestions: string[] = [];
    const scriptLower = script.toLowerCase();

    // Pattern: DOM inspection/querying
    if (scriptLower.match(/queryselector|getelementby|getelement|innerhtml|outerhtml|children|childnodes/)) {
      suggestions.push('📍 DOM Inspection - Use inspect_dom({ selector: "..." }) for page structure');
    }

    // Pattern: Getting text content
    if (scriptLower.match(/textcontent|innertext/)) {
      suggestions.push('📝 Text Content - Use get_visible_text() or find_by_text({ text: "..." })');
    }

    // Pattern: Getting element position/size/layout
    if (scriptLower.match(/getboundingclientrect|offsetwidth|offsetheight|offsetleft|offsettop|clientwidth|clientheight/)) {
      suggestions.push('📏 Element Measurements - Use measure_element({ selector: "..." })');
    }

    // Pattern: Walking up DOM tree / checking parents
    if (scriptLower.match(/parentelement|parentnode|offsetparent|closest/) ||
        (scriptLower.match(/while.*parent/) && scriptLower.match(/getcomputedstyle/))) {
      suggestions.push('🔼 Parent Chain - Use inspect_ancestors({ selector: "..." }) to see parent constraints');
    }

    // Pattern: Checking visibility
    if (scriptLower.match(/offsetparent|visibility|display.*none|opacity/)) {
      suggestions.push('👁️  Visibility Check - Use element_visibility({ selector: "..." })');
    }

    // Pattern: Getting computed styles
    if (scriptLower.match(/getcomputedstyle|style\.|currentstyle/)) {
      suggestions.push('🎨 CSS Styles - Use get_computed_styles({ selector: "..." })');
    }

    // Pattern: Checking element existence
    if (scriptLower.match(/\!=\s*null|\!==\s*null/) && scriptLower.match(/queryselector/)) {
      suggestions.push('✓ Element Existence - Use element_exists({ selector: "..." })');
    }

    // Pattern: Finding test IDs
    if (scriptLower.match(/data-testid|data-test|data-cy/)) {
      suggestions.push('🔍 Test IDs - Use get_test_ids() to discover all test identifiers');
    }

    // Pattern: Comparing positions/alignment
    if (scriptLower.match(/getboundingclientrect.*getboundingclientrect/) ||
        (scriptLower.match(/\.left|\.top|\.right|\.bottom/) && scriptLower.match(/===|==|!==|!=/))) {
      suggestions.push('⚖️  Position Comparison - Use compare_positions({ selector1: "...", selector2: "..." })');
    }

    return suggestions;
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const result = await page.evaluate(args.script);

      // Convert result to string for display
      let resultStr: string;
      try {
        resultStr = JSON.stringify(result, null, 2);
      } catch (error) {
        resultStr = String(result);
      }

      const messages = [
        `✓ Executed JavaScript:`,
        `${args.script}`,
        ``,
        `Result:`,
        `${resultStr}`
      ];

      // Detect if specialized tools would be better
      const suggestions = this.detectBetterToolSuggestions(args.script);
      if (suggestions.length > 0) {
        messages.push('');
        messages.push('💡 Consider using specialized tools instead:');
        suggestions.forEach(suggestion => messages.push(`   ${suggestion}`));
        messages.push('');
        messages.push('ℹ️  Specialized tools are more reliable and token-efficient than evaluate()');
      }

      return createSuccessResponse(messages);
    });
  }
}
