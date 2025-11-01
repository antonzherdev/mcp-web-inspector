import { BrowserToolBase } from '../base.js';
import {
  ToolContext,
  ToolResponse,
  ToolMetadata,
  SessionConfig,
  createSuccessResponse,
  createErrorResponse,
} from '../../common/types.js';
import { makeConfirmPreview } from '../../common/confirmHelpers.js';

/**
 * Tool for executing JavaScript in the browser
 */
export class EvaluateTool extends BrowserToolBase {

  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "evaluate",
      description: "⚙️ CUSTOM JAVASCRIPT EXECUTION - Execute arbitrary JavaScript in the browser console and return a compact, token-efficient summary of the result. Includes a large-output preview guard with a one-time token. ⚠️ NOT for: scroll detection (inspect_dom shows 'scrollable ↕️'), element dimensions (use measure_element), DOM inspection (use inspect_dom), CSS properties (use get_computed_styles), position comparison (use compare_element_alignment). Use ONLY when specialized tools cannot accomplish the task. Automatically detects common patterns and suggests better alternatives.",
      outputs: [
        "Header: '✓ JavaScript execution result:'",
        "Default result: compact summary string (arrays/objects/dom nodes summarized)",
        "Array summary: 'Array(n) [first, second, third…]' (shows first 3 items)",
        "Object summary (large): 'Object(n keys): key1, key2, key3…' (top-level keys only)",
        "DOM node summary: '<tag id=#id class=.a.b> @ (x,y) WxH' (rounded ints)",
        "NodeList/HTMLCollection summary: 'NodeList(n) [<div…>, <span…>, <a…>…]'",
        "Preview guard when result is large (≥ ~2000 chars):",
        "  - 'Preview (first 500 chars):' followed by excerpt",
        "  - Counts: 'totalLength: N, shownLength: M, truncated: true'",
        "  - One-time token string to fetch full output",
        "Suggestions block (conditional): compact tips for specialized tools based on script patterns",
      ],
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
        '   • get_text - Extract all visible text\n' +
        '   • find_by_text({ text: "..." }) - Locate elements by content'
      );
    }

    // Pattern: Checking if element is scrollable (scrollHeight > clientHeight)
    if (scriptLower.match(/scrollheight|clientheight|scrollwidth|clientwidth/) &&
        (scriptLower.match(/scrollheight.*clientheight|clientheight.*scrollheight|scrollwidth.*clientwidth|clientwidth.*scrollwidth/) ||
         scriptLower.match(/>\s*el\.clientheight|<\s*el\.scrollheight/))) {
      suggestions.push(
        '📜 Scroll Detection - Use inspect_dom({ selector: "..." })\n' +
        '   Why: Already shows "scrollable ↕️ [amount]px" for overflow containers\n' +
        '   Token savings: ~90% fewer tokens than evaluate() + manual calculation\n' +
        '   Better than: Comparing scrollHeight > clientHeight manually'
      );
    }

    // Pattern: Getting element position/size/layout
    if (scriptLower.match(/getboundingclientrect|offsetwidth|offsetheight|offsetleft|offsettop/) ||
        (scriptLower.match(/clientwidth|clientheight/) && !scriptLower.match(/scrollheight|scrollwidth/))) {
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
        '👁️  Visibility Check - Use check_visibility({ selector: "..." })\n' +
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
        '⚖️  Position Comparison - Use compare_element_alignment({ selector1: "...", selector2: "..." })\n' +
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
      const PREVIEW_THRESHOLD = 2000; // chars

      // Execute the script and produce a compact textual summary entirely in the page context
      // to safely handle DOM nodes and browser-specific objects.
      const evalReturn = await page.evaluate(async (userScript: string) => {
        const toInt = (n: number) => Math.max(0, Math.round(n || 0));

        // Summarize a DOM element
        const summarizeElement = (el: Element): string => {
          try {
            const tag = (el.tagName || '').toLowerCase();
            const id = (el as HTMLElement).id ? ` #${(el as HTMLElement).id}` : '';
            const cls = (el as HTMLElement).classList?.length
              ? ' ' + Array.from((el as HTMLElement).classList)
                  .map(c => `.${c}`)
                  .join('')
              : '';
            const rect = (el as HTMLElement).getBoundingClientRect?.() as DOMRect;
            const x = toInt(rect?.left ?? 0);
            const y = toInt(rect?.top ?? 0);
            const w = toInt(rect?.width ?? 0);
            const h = toInt(rect?.height ?? 0);
            return `<${tag}${id}${cls}> @ (${x},${y}) ${w}x${h}`;
          } catch {
            const tag = (el.tagName || '').toLowerCase();
            return `<${tag}>`;
          }
        };

        // Render values compactly
        const render = (val: any, depth: number, seen: WeakSet<object>): string => {
          const MAX_DEPTH = 3;
          const ARRAY_PREVIEW = 3;
          const LARGE_ARRAY_THRESHOLD = 10;
          const LARGE_OBJECT_THRESHOLD = 15;

          const t = Object.prototype.toString.call(val);
          if (val === null) return 'null';
          if (val === undefined) return 'undefined';
          if (typeof val === 'string') return JSON.stringify(val);
          if (typeof val === 'number' || typeof val === 'boolean') return String(val);
          if (typeof val === 'bigint') return `${String(val)}n`;
          if (typeof val === 'function') return `[Function ${val.name || 'anonymous'}]`;
          if (t === '[object Date]') return `Date(${(val as Date).toISOString?.() || String(val)})`;
          if (t === '[object RegExp]') return String(val);
          if (t === '[object Error]') return `${val.name || 'Error'}: ${val.message || String(val)}`;

          // DOM element
          if (typeof Element !== 'undefined' && val instanceof Element) {
            return summarizeElement(val);
          }
          // NodeList / HTMLCollection
          if (
            (typeof NodeList !== 'undefined' && val instanceof NodeList) ||
            (typeof HTMLCollection !== 'undefined' && val instanceof HTMLCollection)
          ) {
            const arr = Array.from(val as any);
            const head = arr.slice(0, ARRAY_PREVIEW).map((e) =>
              typeof Element !== 'undefined' && e instanceof Element ? summarizeElement(e) : render(e, depth + 1, seen)
            );
            const more = arr.length > ARRAY_PREVIEW ? '…' : '';
            return `NodeList(${arr.length}) [${head.join(', ')}${more}]`;
          }

          if (depth >= MAX_DEPTH) {
            if (Array.isArray(val)) return `Array(${val.length}) […]`;
            if (val && typeof val === 'object') return `Object(${Object.keys(val).length} keys) …`;
            return String(val);
          }

          // Avoid circular structures
          if (val && typeof val === 'object') {
            if (seen.has(val)) return '[Circular]';
            seen.add(val);
          }

          if (Array.isArray(val)) {
            if (val.length > LARGE_ARRAY_THRESHOLD) {
              const head = val.slice(0, ARRAY_PREVIEW).map((v) => render(v, depth + 1, seen));
              const more = val.length > ARRAY_PREVIEW ? '…' : '';
              return `Array(${val.length}) [${head.join(', ')}${more}]`;
            }
            return `[${val.map((v) => render(v, depth + 1, seen)).join(', ')}]`;
          }

          // Map / Set
          if (t === '[object Map]') {
            const m = val as Map<any, any>;
            const entries = Array.from(m.entries()).slice(0, ARRAY_PREVIEW).map(([k, v]) => `${render(k, depth + 1, seen)} => ${render(v, depth + 1, seen)}`);
            const more = m.size > ARRAY_PREVIEW ? '…' : '';
            return `Map(${m.size}) {${entries.join(', ')}${more}}`;
          }
          if (t === '[object Set]') {
            const s = val as Set<any>;
            const entries = Array.from(s.values()).slice(0, ARRAY_PREVIEW).map((v) => render(v, depth + 1, seen));
            const more = s.size > ARRAY_PREVIEW ? '…' : '';
            return `Set(${s.size}) {${entries.join(', ')}${more}}`;
          }

          if (val && typeof val === 'object') {
            const keys = Object.keys(val);
            if (keys.length > LARGE_OBJECT_THRESHOLD) {
              const head = keys.slice(0, ARRAY_PREVIEW).join(', ');
              const more = keys.length > ARRAY_PREVIEW ? '…' : '';
              return `Object(${keys.length} keys): ${head}${more}`;
            }
            // Render small object inline key: value
            const parts: string[] = [];
            for (const k of keys) {
              try {
                parts.push(`${k}: ${render((val as any)[k], depth + 1, seen)}`);
              } catch (e) {
                parts.push(`${k}: [Unserializable]`);
              }
            }
            return `{ ${parts.join(', ')} }`;
          }

          return String(val);
        };

        try {
          // Build an async function so both sync and async scripts are supported
          const AsyncFunction = Object.getPrototypeOf(async function () {/**/}).constructor as any;
          const fn = new AsyncFunction(userScript);
          const result = await fn();
          const text = render(result, 0, new WeakSet());
          return { ok: true, text } as const;
        } catch (e: any) {
          return { ok: false, error: e?.message || String(e) } as const;
        }
      }, args.script);

      // Backward compatibility: if the page evaluation returns a raw value (string/any)
      // instead of the { ok, text } envelope, treat it as the final result string.
      let resultStr: string;
      if (evalReturn && typeof evalReturn === 'object' && 'ok' in evalReturn) {
        const { ok, text, error: execError } = evalReturn as any;
        if (!ok) {
          return createErrorResponse(`JavaScript execution failed: ${execError}`);
        }
        resultStr = text || '';
      } else {
        try {
          resultStr = typeof evalReturn === 'string' ? evalReturn : JSON.stringify(evalReturn, null, 2);
        } catch {
          resultStr = String(evalReturn);
        }
      }

      // Guard for large outputs: preview + confirm
      const totalLength = resultStr.length;

      const lines: string[] = [];
      const suggestions = this.detectBetterToolSuggestions(args.script);

      if (totalLength >= PREVIEW_THRESHOLD) {
        const previewLen = Math.min(500, totalLength);
        const preview = resultStr.slice(0, previewLen);
        const previewBlock = makeConfirmPreview(resultStr, {
          headerLine: '✓ JavaScript execution result (preview):',
          counts: { totalLength, shownLength: previewLen, truncated: true },
          previewLines: [
            'Preview (first 500 chars):',
            preview,
            ...(totalLength > previewLen ? ['...'] : []),
          ],
          extraTips: ['Tip: Prefer specialized tools or narrow the script when possible.'],
        });

        lines.push(...previewBlock.lines);

        if (suggestions.length > 0) {
          lines.push('');
          lines.push('💡 Consider specialized tools:');
          suggestions.forEach(s => lines.push(`   ${s}`));
        }

        return createSuccessResponse(lines);
      }

      const messages = [`✓ JavaScript execution result:`, resultStr];

      // Detect if specialized tools would be better
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
