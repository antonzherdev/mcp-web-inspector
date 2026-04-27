/**
 * Tests for the evaluate tool covering:
 *   #1 — auto-return for single expressions, fallback to statement body
 *   #2 — windowed hint dedup with idle reset
 *   #3 — console errors during evaluate become a warning, not isError:true
 */

import { handleToolCall } from '../../../../toolHandler.js';
import { getToolInstance } from '../../../common/registry.js';
import { EvaluateTool } from '../evaluate.js';
import { jest } from '@jest/globals';
import { browserAvailable } from '../../../../__tests__/helpers/browserSetup.js';

const mockServer = { sendMessage: jest.fn() };

const d = browserAvailable ? describe : describe.skip;

const blankPage = (extraScript = '') => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>evaluate-test</title></head>
      <body>
        <a id="link" href="/x">Hello</a>
        <button id="b">Click</button>
        <script>${extraScript}</script>
      </body>
    </html>
  `;
  return `data:text/html;base64,${Buffer.from(html).toString('base64')}`;
};

const text = (result: any) => result.content.map((c: any) => c.text).join('\n');

const evaluateInstance = (): EvaluateTool => getToolInstance('evaluate', null) as EvaluateTool;

const resetEvaluateState = () => {
  const inst = evaluateInstance() as any;
  // Reset session-scoped dedup state between tests so each test starts fresh.
  inst.shownHintKeys = new Set<string>();
  inst.lastEvaluateAt = 0;
  // Restore the default clock if a prior test stubbed it.
  delete inst.now;
};

d('evaluate — auto-return single expressions (item #1)', () => {
  beforeEach(async () => {
    resetEvaluateState();
    await handleToolCall('navigate', { url: blankPage(), headless: true }, mockServer);
  });

  afterAll(async () => {
    await handleToolCall('close', {}, mockServer);
  });

  test('bare expression returns its value', async () => {
    const result = await handleToolCall('evaluate', { script: 'JSON.stringify({a:1})' }, mockServer);
    expect(result.isError).toBe(false);
    // The result is a string; the compact renderer JSON-stringifies strings, so the
    // expected output contains the escaped form of {"a":1}.
    expect(text(result)).toContain('{\\"a\\":1}');
  });

  test('arithmetic expression returns its value', async () => {
    const result = await handleToolCall('evaluate', { script: '1 + 2' }, mockServer);
    expect(result.isError).toBe(false);
    expect(text(result)).toContain('3');
  });

  test('multi-statement script with explicit return still works', async () => {
    const result = await handleToolCall('evaluate', { script: 'const x = 1; return x + 2;' }, mockServer);
    expect(result.isError).toBe(false);
    expect(text(result)).toContain('3');
  });

  test('control-flow with multiple returns works', async () => {
    const result = await handleToolCall(
      'evaluate',
      { script: 'if (true) { return 1; } else { return 2; }' },
      mockServer
    );
    expect(result.isError).toBe(false);
    expect(text(result)).toContain('1');
  });

  test('async expression returns its awaited value', async () => {
    const result = await handleToolCall(
      'evaluate',
      { script: "await Promise.resolve('ok')" },
      mockServer
    );
    expect(result.isError).toBe(false);
    expect(text(result)).toContain('"ok"');
  });

  test('object-literal-shaped script does not crash (falls back gracefully)', async () => {
    // `{a:1}` parses as a labeled-statement block when used as a function body — but as
    // an expression the wrapped `return ({a:1})` form parses fine and returns the object.
    const result = await handleToolCall('evaluate', { script: '({a:1})' }, mockServer);
    expect(result.isError).toBe(false);
    // The compact renderer emits something like `{ a: 1 }` for small objects.
    expect(text(result)).toMatch(/a:\s*1/);
  });
});

d('evaluate — windowed hint dedup (item #2)', () => {
  beforeEach(async () => {
    resetEvaluateState();
    await handleToolCall('navigate', { url: blankPage(), headless: true }, mockServer);
  });

  afterAll(async () => {
    await handleToolCall('close', {}, mockServer);
  });

  test('hint is shown on first matching call, suppressed on second within the window', async () => {
    const r1 = await handleToolCall(
      'evaluate',
      { script: 'document.querySelector("#link").innerHTML' },
      mockServer
    );
    expect(text(r1)).toContain('inspect_dom');

    const r2 = await handleToolCall(
      'evaluate',
      { script: 'document.querySelector("#b").innerHTML' },
      mockServer
    );
    expect(text(r2)).not.toContain('inspect_dom');
  });

  test('different patterns emit their own hints (and only once each)', async () => {
    const r1 = await handleToolCall(
      'evaluate',
      { script: 'document.querySelector("#link").innerHTML' },
      mockServer
    );
    expect(text(r1)).toContain('inspect_dom');
    expect(text(r1)).not.toContain('get_computed_styles');

    const r2 = await handleToolCall(
      'evaluate',
      { script: 'getComputedStyle(document.querySelector("#link")).color' },
      mockServer
    );
    // The new pattern emits its own hint; the previously-shown one is not repeated.
    expect(text(r2)).toContain('get_computed_styles');
    expect(text(r2)).not.toContain('inspect_dom');
  });

  test('idle reset: after IDLE_WINDOW_MS the same hint is emitted again', async () => {
    const inst: any = evaluateInstance();
    let fakeNow = 1_000_000;
    inst.now = () => fakeNow;

    const r1 = await handleToolCall(
      'evaluate',
      { script: 'document.querySelector("#link").innerHTML' },
      mockServer
    );
    expect(text(r1)).toContain('inspect_dom');

    // Advance past the 10-minute window
    fakeNow += 11 * 60 * 1000;

    const r2 = await handleToolCall(
      'evaluate',
      { script: 'document.querySelector("#link").innerHTML' },
      mockServer
    );
    expect(text(r2)).toContain('inspect_dom');
  });

  test('script with no matching pattern produces no hint block', async () => {
    const r = await handleToolCall('evaluate', { script: '1 + 2' }, mockServer);
    expect(text(r)).not.toContain('Specialized tools');
  });
});

d('evaluate — console errors during evaluate are a warning, not a failure (item #3)', () => {
  beforeEach(async () => {
    resetEvaluateState();
    await handleToolCall('navigate', { url: blankPage(), headless: true }, mockServer);
    await handleToolCall('clear_console_logs', {}, mockServer);
  });

  afterAll(async () => {
    await handleToolCall('close', {}, mockServer);
  });

  test('script that triggers console.error returns success with a warning', async () => {
    const result = await handleToolCall(
      'evaluate',
      { script: "console.error('oops'); return 42;" },
      mockServer
    );
    expect(result.isError).toBe(false);
    const out = text(result);
    expect(out).toContain('42');
    expect(out).toMatch(/Console errors observed during evaluate/);
  });
});
