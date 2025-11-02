import { describe, expect, test } from '@jest/globals';
import { createErrorResponse } from '../tools/common/types.js';

describe('createErrorResponse sanitization', () => {
  test('removes stack frames from selector engine errors', () => {
    const raw = "Failed to query selector: locator.all: SyntaxError: Failed to execute 'querySelectorAll' on 'Document': '.flex.min-w-[280px].max-w-[480px]' is not a valid selector.\n    at query (<anonymous>:4989:41)\n    at <anonymous>:4999:7\n    at SelectorEvaluatorImpl._cached (<anonymous>:4776:20)";
    const res = createErrorResponse(raw);
    const text = (res.content[0] as any).text as string;
    expect(text).toContain("is not a valid selector");
    expect(text).not.toContain("at query (");
    expect(text).not.toContain("<anonymous>:");
  });

  test('keeps non-stack multi-line guidance intact', () => {
    const msg = [
      'Operation failed: Invalid CSS selector: ".bad:selector"',
      '💡 Tips:',
      '  • Prefer test IDs',
    ].join('\n');
    const res = createErrorResponse(msg);
    const text = (res.content[0] as any).text as string;
    expect(text).toContain('Invalid CSS selector');
    expect(text).toContain('💡 Tips:');
  });

  test('preserves tips after selector phrase and strips stacks', () => {
    const raw = [
      'Operation failed: Invalid CSS selector: ".flex.min-w-[300px].flex-1"',
      "Selector syntax error: locator.count: SyntaxError: Failed to execute 'querySelectorAll' on 'Document': '.flex.min-w-[300px].flex-1' is not a valid selector.",
      '💡 Tips:',
      '  • Tailwind arbitrary values need escaping in class selectors: .min-w-\\[300px\\]',
      '  • Colons in class names must be escaped: .dark\\:bg-gray-700',
      '    at query (<anonymous>:4989:41)'
    ].join('\n');

    const res = createErrorResponse(raw);
    const text = (res.content[0] as any).text as string;
    expect(text).toContain('is not a valid selector');
    expect(text).toContain('Tailwind arbitrary values need escaping');
    expect(text).not.toContain('at query (');
  });
});
