import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for executing JavaScript in the browser
 */
export class EvaluateTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "evaluate",
      description: "Execute JavaScript in the browser console and return the result (JSON-stringified). Automatically detects common patterns and suggests specialized tools when applicable. ⚠️ AVOID for common tasks - use specialized tools instead: inspect_dom() for page structure, compare_positions() for alignment, measure_element() for spacing/dimensions, query_selector() for finding elements. Only use evaluate() for custom logic not covered by other tools.",
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
      suggestions.push(
        '📍 DOM Inspection - Use inspect_dom({ selector: "..." })\n' +
        '   Why: Returns semantic structure with test IDs, ARIA roles, interactive elements\n' +
        '   Token savings: ~60% fewer tokens than parsing raw HTML'
      );
    }

    // Pattern: Getting text content
    if (scriptLower.match(/textcontent|innertext/)) {
      suggestions.push(
        '📝 Text Content\n' +
        '   • get_visible_text() - Extract all visible text\n' +
        '   • find_by_text({ text: "..." }) - Locate elements by content'
      );
    }

    // Pattern: Getting element position/size/layout
    if (scriptLower.match(/getboundingclientrect|offsetwidth|offsetheight|offsetleft|offsettop|clientwidth|clientheight/)) {
      suggestions.push(
        '📏 Element Measurements - Use measure_element({ selector: "..." })\n' +
        '   Why: Returns position, size, gaps to siblings, and visibility state\n' +
        '   Better than: Manual getBoundingClientRect() + visibility checks'
      );
    }

    // Pattern: Walking up DOM tree / checking parents
    if (scriptLower.match(/parentelement|parentnode|offsetparent|closest/) ||
        (scriptLower.match(/while.*parent/) && scriptLower.match(/getcomputedstyle/))) {
      suggestions.push(
        '🔼 Parent Chain - Use inspect_ancestors({ selector: "..." })\n' +
        '   Why: Shows width constraints, margins, overflow, flexbox/grid context\n' +
        '   Detects: Clipping points (🎯), centering via auto margins, layout issues'
      );
    }

    // Pattern: Checking visibility
    if (scriptLower.match(/offsetparent|visibility|display.*none|opacity/)) {
      suggestions.push(
        '👁️  Visibility Check - Use element_visibility({ selector: "..." })\n' +
        '   Returns: isVisible, inViewport, opacity, display, visibility properties\n' +
        '   More reliable: Handles edge cases (opacity:0, visibility:hidden, etc.)'
      );
    }

    // Pattern: Getting computed styles
    if (scriptLower.match(/getcomputedstyle|style\.|currentstyle/)) {
      suggestions.push(
        '🎨 CSS Styles - Use get_computed_styles({ selector: "..." })\n' +
        '   Why: Returns filtered, relevant styles in compact format\n' +
        '   Token savings: ~70% fewer tokens than full getComputedStyle() dump'
      );
    }

    // Pattern: Checking element existence
    if (scriptLower.match(/\!=\s*null|\!==\s*null/) && scriptLower.match(/queryselector/)) {
      suggestions.push(
        '✓ Element Existence - Use element_exists({ selector: "..." })\n' +
        '   Returns: Boolean + element summary if found\n' +
        '   Simpler: No need for null checks'
      );
    }

    // Pattern: Finding test IDs
    if (scriptLower.match(/data-testid|data-test|data-cy/)) {
      suggestions.push(
        '🔍 Test IDs - Use get_test_ids()\n' +
        '   Returns: All test identifiers grouped by type\n' +
        '   Detects: Duplicates and validation issues'
      );
    }

    // Pattern: Comparing positions/alignment
    if (scriptLower.match(/getboundingclientrect.*getboundingclientrect/) ||
        (scriptLower.match(/\.left|\.top|\.right|\.bottom/) && scriptLower.match(/===|==|!==|!=/))) {
      suggestions.push(
        '⚖️  Position Comparison - Use compare_positions({ selector1: "...", selector2: "..." })\n' +
        '   Returns: Alignment status (left/right/top/bottom/center), pixel gaps\n' +
        '   Perfect for: Checking if elements are aligned or overlapping'
      );
    }

    // Pattern: Scrolling operations
    if (scriptLower.match(/scrollto|scrollby|scrollintoview|scrolltop|scrollleft|window\.scroll|pageyoffset|scrolly/)) {
      suggestions.push(
        '📜 Scrolling - Use specialized scroll tools\n' +
        '   • scroll_to_element({ selector: "...", position: "start|center|end" })\n' +
        '     → Scrolls element into view (handles containers automatically)\n' +
        '   • scroll_by({ selector: "html", pixels: 500 })\n' +
        '     → Precise pixel scrolling for testing sticky headers, infinite scroll\n' +
        '   Why: Playwright auto-scrolls before interactions, but these tools help with\n' +
        '        testing scroll behavior, lazy-loading, and scroll-triggered content'
      );
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
        `✓ JavaScript execution result:`,
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
