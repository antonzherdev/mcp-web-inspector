import { BrowserToolBase } from '../base.js';
import {
  ToolContext,
  ToolResponse,
  ToolMetadata,
  SessionConfig,
  ANNOTATIONS,
  createSuccessResponse,
  createErrorResponse,
} from '../../common/types.js';
import { makeConfirmPreview } from '../../common/confirm_output.js';
import { gatherConsoleErrorsSince, quickNetworkIdleNote } from '../common/postAction.js';

/**
 * Tool for executing JavaScript in the browser
 */
export class EvaluateTool extends BrowserToolBase {

  // Track which hint keys have been emitted in the current working window.
  // The window resets whenever evaluate has been idle for IDLE_WINDOW_MS, which
  // approximates a `/clear` / new-conversation boundary on stdio MCP (no protocol
  // signal exists for that). See plan: see-todo-web-inspector-mcp-improvements.
  private shownHintKeys = new Set<string>();
  private lastEvaluateAt = 0;
  private static readonly IDLE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  // Overridable for tests (avoid jest.useFakeTimers since real Playwright runs)
  protected now(): number { return Date.now(); }

  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "evaluate",
      description: "[may return preview+token] ⚙️ CUSTOM JAVASCRIPT EXECUTION - Execute arbitrary JavaScript in the browser console and return a compact, token-efficient summary of the result. Single expressions return their value automatically; multi-statement scripts must use `return`. Includes a large-output preview guard with a one-time token. ⚠️ NOT for: scroll detection (inspect_dom shows 'scrollable ↕️'), element dimensions (use measure_element), DOM inspection (use inspect_dom), CSS properties (use get_computed_styles), position comparison (use compare_element_alignment). Use ONLY when specialized tools cannot accomplish the task. Automatically detects common patterns and suggests better alternatives.",
      annotations: ANNOTATIONS.arbitrary,
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
   * Detect common patterns and suggest better tools.
   * Returns compact one-line hints, each tagged with a stable key for session-scoped dedup.
   */
  private detectBetterToolSuggestions(script: string): { key: string; line: string }[] {
    const suggestions: { key: string; line: string }[] = [];
    const scriptLower = script.toLowerCase();

    if (scriptLower.match(/queryselector|getelementby|getelement|innerhtml|outerhtml|children|childnodes/)) {
      suggestions.push({ key: 'inspect_dom', line: '📍 inspect_dom — semantic DOM with test IDs/ARIA (vs querySelector/innerHTML)' });
    }

    if (scriptLower.match(/textcontent|innertext/)) {
      suggestions.push({ key: 'text', line: '📝 get_text / find_by_text — extract or locate visible text' });
    }

    if (scriptLower.match(/scrollheight|clientheight|scrollwidth|clientwidth/) &&
        (scriptLower.match(/scrollheight.*clientheight|clientheight.*scrollheight|scrollwidth.*clientwidth|clientwidth.*scrollwidth/) ||
         scriptLower.match(/>\s*el\.clientheight|<\s*el\.scrollheight/))) {
      suggestions.push({ key: 'scroll_detect', line: '📜 inspect_dom — shows "scrollable ↕️Npx" (vs scrollHeight/clientHeight)' });
    }

    if (scriptLower.match(/getboundingclientrect|offsetwidth|offsetheight|offsetleft|offsettop/) ||
        (scriptLower.match(/clientwidth|clientheight/) && !scriptLower.match(/scrollheight|scrollwidth/))) {
      suggestions.push({ key: 'measure', line: '📏 measure_element — position/size/gaps/visibility (vs getBoundingClientRect)' });
    }

    if (scriptLower.match(/parentelement|parentnode|offsetparent|closest/) ||
        (scriptLower.match(/while.*parent/) && scriptLower.match(/getcomputedstyle/))) {
      suggestions.push({ key: 'ancestors', line: '🔼 inspect_ancestors — width/margin/overflow chain (vs walking parentElement)' });
    }

    if (scriptLower.match(/offsetparent|visibility|display.*none|opacity/)) {
      suggestions.push({ key: 'visibility', line: '👁️  check_visibility — handles opacity/visibility edge cases' });
    }

    if (scriptLower.match(/getcomputedstyle|style\.|currentstyle/)) {
      suggestions.push({ key: 'styles', line: '🎨 get_computed_styles — filtered relevant styles (vs full getComputedStyle)' });
    }

    if (scriptLower.match(/\!=\s*null|\!==\s*null/) && scriptLower.match(/queryselector/)) {
      suggestions.push({ key: 'exists', line: '✓ element_exists — boolean + summary (vs querySelector !== null)' });
    }

    if (scriptLower.match(/data-testid|data-test|data-cy/)) {
      suggestions.push({ key: 'testids', line: '🔍 get_test_ids — all data-testid/data-test/data-cy grouped' });
    }

    if (scriptLower.match(/getboundingclientrect.*getboundingclientrect/) ||
        (scriptLower.match(/\.left|\.top|\.right|\.bottom/) && scriptLower.match(/===|==|!==|!=/))) {
      suggestions.push({ key: 'align', line: '⚖️  compare_element_alignment — alignment + pixel gaps (vs comparing rects)' });
    }

    if (scriptLower.match(/scrollto|scrollby|scrollintoview|scrolltop|scrollleft|window\.scroll|pageyoffset|scrolly/)) {
      suggestions.push({ key: 'scroll', line: '📜 scroll_to_element / scroll_by — vs scrollTo/scrollIntoView/pageYOffset' });
    }

    // Pattern: Navigation (top-level or SPA routing)
    if (
      scriptLower.match(/\blocation\s*\./) ||
      scriptLower.match(/window\s*\.\s*location/) ||
      scriptLower.match(/document\s*\.\s*location/) ||
      scriptLower.match(/history\s*\.\s*pushstate|history\s*\.\s*replacestate/) ||
      scriptLower.match(/location\s*=(?!\s*location)/) ||
      scriptLower.match(/location\s*\.\s*href\s*=|location\s*\.\s*assign|location\s*\.\s*replace/)
    ) {
      suggestions.push({ key: 'nav', line: '🌐 navigate / go_history — vs window.location / history.pushState' });
    }

    return suggestions;
  }

  /**
   * Filter `suggestions` down to the ones not already shown in this working window.
   * If we've been idle longer than IDLE_WINDOW_MS, reset first.
   * Mutates this.shownHintKeys with the freshly-emitted keys.
   */
  private filterFreshHints(suggestions: { key: string; line: string }[]): { key: string; line: string }[] {
    const now = this.now();
    if (now - this.lastEvaluateAt > EvaluateTool.IDLE_WINDOW_MS) {
      this.shownHintKeys.clear();
    }
    this.lastEvaluateAt = now;
    const fresh = suggestions.filter(s => !this.shownHintKeys.has(s.key));
    fresh.forEach(s => this.shownHintKeys.add(s.key));
    return fresh;
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
          // Build an async function so both sync and async scripts are supported.
          // Try treating the script as a single expression first (so bare expressions
          // like `JSON.stringify(x)` return their value); fall back to statement-body
          // form for multi-statement scripts that use `return`, declarations, etc.
          const AsyncFunction = Object.getPrototypeOf(async function () {/**/}).constructor as any;
          let fn: any;
          try {
            fn = new AsyncFunction(`return (\n${userScript}\n);`);
          } catch {
            fn = new AsyncFunction(userScript);
          }
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

      // Detect navigation patterns in the script for post-action waits
      const scriptLower = (args.script || '').toLowerCase();
      const navDetected = (
        /\blocation\s*\./.test(scriptLower) ||
        /window\s*\.\s*location/.test(scriptLower) ||
        /document\s*\.\s*location/.test(scriptLower) ||
        /history\s*\.\s*pushstate|history\s*\.\s*replacestate/.test(scriptLower) ||
        /location\s*=(?!\s*location)/.test(scriptLower) ||
        /location\s*\.\s*href\s*=|location\s*\.\s*assign|location\s*\.\s*replace/.test(scriptLower)
      );

      // Optional quick network-idle note when navigation is detected
      let netIdleNote: string | null = null;
      if (navDetected) {
        try {
          const note = await quickNetworkIdleNote(page);
          if (note) netIdleNote = note;
        } catch {
          // ignore
        }
      }

      // After script execution, gather console errors since this interaction.
      // We surface them as a warning, not as a failed response — the script ran fine.
      let consoleErrorWarning: string[] | null = null;
      try {
        const errs = await gatherConsoleErrorsSince('interaction');
        if (errs.length > 0) {
          consoleErrorWarning = [
            '',
            `⚠ Console errors observed during evaluate (${errs.length}):`,
            ...errs.slice(0, 3).map(e => `  ${e}`),
            ...(errs.length > 3 ? [`  …and ${errs.length - 3} more (use get_console_logs)`] : []),
          ];
        }
      } catch {
        // Best-effort; continue on failure
      }

      // Guard for large outputs: preview + confirm
      const totalLength = resultStr.length;

      const lines: string[] = [];
      const allSuggestions = this.detectBetterToolSuggestions(args.script);
      const freshSuggestions = this.filterFreshHints(allSuggestions);

      if (totalLength >= PREVIEW_THRESHOLD) {
        const previewLen = Math.min(500, totalLength);
        const preview = resultStr.slice(0, previewLen);
        const previewBlock = makeConfirmPreview(() => resultStr, {
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

        if (netIdleNote) {
          lines.push('');
          lines.push(netIdleNote);
        }

        if (freshSuggestions.length > 0) {
          lines.push('');
          lines.push('💡 Specialized tools:');
          freshSuggestions.forEach(s => lines.push(`   ${s.line}`));
        }

        if (consoleErrorWarning) lines.push(...consoleErrorWarning);

        return createSuccessResponse(lines);
      }

      const messages = [`✓ JavaScript execution result:`, resultStr];

      if (netIdleNote) {
        messages.push('');
        messages.push(netIdleNote);
      }

      if (freshSuggestions.length > 0) {
        messages.push('');
        messages.push('💡 Specialized tools:');
        freshSuggestions.forEach(s => messages.push(`   ${s.line}`));
      }

      if (consoleErrorWarning) messages.push(...consoleErrorWarning);

      return createSuccessResponse(messages);
    });
  }
}
