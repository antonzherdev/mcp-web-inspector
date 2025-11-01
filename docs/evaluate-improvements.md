# Evaluate Tool — Token Efficiency and UX Improvements

This note proposes targeted changes to reduce overuse of `evaluate`, improve LLM guidance, and lower token costs while preserving flexibility.

## Goals

- Encourage specialized tools over `evaluate` when appropriate
- Cut output token usage for large/structured results
- Avoid schema churn and friction (no new required params)
- Support repeated custom logic without resending scripts

## Quick Fixes (Applied)

- Correct suggestion names in `evaluate` to match actual tools:
  - `get_visible_text()` → `get_text`
  - `element_visibility` → `check_visibility`
  - `compare_positions` → `compare_element_alignment`

## Large‑Output Guard (Preview + Confirm)

- Add a preview/truncation guard to `evaluate` (same pattern as planned for console logs):
  - Defaults: show up to ~2,000 chars; include counts (`totalLength`, `shownLength`), `truncated` flag, and a one‑time `confirmToken` to fetch full output.
  - Tips in preview: suggest refining via specialized tools or narrowing the script.
  - Update metadata to enumerate conditional outputs (preview counts, truncation flags, token, exact line formats).
- Summarize bulky structures by default:
  - Arrays: `Array(n) [first 3 items…]`
  - Objects: list top‑level keys only
  - DOM nodes: compact tag/id/class with one‑line position: `"<tag id=#id class=.a.b> @ (x,y) WxH"`

## Function Registry (Define Once, Call Many)

Introduce two atomic tools to avoid resending the same script repeatedly:

- `eval_define_function({ name: string, source: string })`
  - Defines `window.__mcpFns[name]` now via `page.evaluate` and persists across navigations via `page.addInitScript`.
  - Output: `✓ Function defined: <name>` or a concise error.

- `eval_call_function({ name: string, argsJson?: string })`
  - Calls `window.__mcpFns[name](...JSON.parse(argsJson||'[]'))` within the page.
  - Reuse the same preview/truncation guard as `evaluate` for returned values.

- (Optional) `eval_list_functions()` to inspect registered names.

Rationale: honors Atomic Operations and Minimal Parameters; significantly reduces repeated token cost when LLMs re‑run nearly identical scripts.

## Intent & Redundancy Nudges (No New Params)

- Do not add a required “explain why” parameter (adds friction, violates Parameter Discipline).
- Instead, embed lightweight nudges in `evaluate`:
  - First use in session: a 1–2 line reminder of specialized tools with concrete examples.
  - On repeated similar calls (e.g., identical or >80% similar script hashes):
    - Single‑line hint: “You’ve run a similar script ×N; define once via `eval_define_function` and call it next.”
  - Implementation: maintain a tiny in‑memory circular buffer of recent script hashes per tool instance.

## Metadata Improvements

- `evaluate.getMetadata()` should explicitly list all outputs:
  - Success with result (preview or full)
  - When suggestions are produced
  - When truncated: counts, `truncated: true`, `confirmToken`
  - Error path with `isError: true`
- Provide example calls and outputs (including preview/confirm flow).
- Optionally lower `priority` to make `evaluate` less attractive in pickers that respect it.

## Safety/UX Enhancements (Optional)

- Set a conservative default timeout for script execution and return a short timeout message with suggestions to narrow the script or use specialized tools.

## Next Steps

1. Implement preview/confirm guard and summarization in `evaluate` and update metadata.
2. Add `eval_define_function` and `eval_call_function` tools; register them and add tests.
3. Add small de‑duplication nudges for repeated scripts.
4. Extend tests for the guard, function lifecycle, and suggestion rendering.
5. Regenerate README via `npm run generate:readme`.

