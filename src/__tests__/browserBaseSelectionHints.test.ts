import { describe, expect, test } from '@jest/globals';
import { BrowserToolBase } from '../tools/browser/base.js';
import type { ToolResponse } from '../tools/common/types.js';

class ExposedBrowserToolBase extends BrowserToolBase {
  constructor() {
    super({});
  }

  // Required abstract method (not used in these tests)
  async execute(): Promise<ToolResponse> {
    throw new Error('Not implemented for tests');
  }

  public hint(selector: string, totalCount: number): string {
    return this.buildNthSelectorHint(selector, totalCount);
  }

  public selectionInfo(selector: string, elementIndex: number, totalCount: number, preferredVisible = true): Promise<string> {
    return this.formatElementSelectionInfo(selector, elementIndex, totalCount, preferredVisible);
  }

  public normalize(selector: string): string {
    return this.normalizeSelector(selector);
  }

  public sanitize(msg: string): string {
    // @ts-ignore accessing protected for test via wrapper
    return this.sanitizeSelectorEngineMessage(msg);
  }

  // Exposes the errorOnMultiple branch of selectPreferredLocator so the
  // rate-limited guidance text can be asserted without needing a real page.
  public async runErrorOnMultiple(count: number, selector: string): Promise<string> {
    const fakeLocator = {
      count: () => Promise.resolve(count),
      nth: (i: number) => ({
        evaluate: () => Promise.resolve({ tag: 'div', text: `match ${i}`, testid: null, id: null, parentLabel: null }),
      }),
    };
    try {
      // @ts-ignore protected
      await this.selectPreferredLocator(fakeLocator, { errorOnMultiple: true, originalSelector: selector });
      return '';
    } catch (e) {
      return (e as Error).message;
    }
  }
}

describe('BrowserToolBase selection hints', () => {
  const tool = new ExposedBrowserToolBase();

  test('buildNthSelectorHint provides copy-ready examples', () => {
    const hint = tool.hint('text=Add Recipe', 3);
    expect(hint).toContain('text=Add Recipe >> nth=0');
    expect(hint).toContain('text=Add Recipe >> nth=2');
  });

  test('buildNthSelectorHint skips selectors already using nth syntax', () => {
    const hint = tool.hint('text=Add Recipe >> nth=1', 4);
    expect(hint).toBe('');
  });

  test('formatElementSelectionInfo appends nth hint and duplicate warning on first emit', async () => {
    const { resetBrowserState } = await import('../toolHandler.js');
    resetBrowserState();
    const info = await tool.selectionInfo('testid:submit', 0, 2);
    expect(info).toContain('using element 1');
    expect(info).toContain('>> nth=0');
    expect(info).toContain('Test IDs should be unique');
  });

  test('formatElementSelectionInfo suppresses verbose hint after first emit (rate-limit)', async () => {
    const { resetBrowserState } = await import('../toolHandler.js');
    resetBrowserState();
    const first = await tool.selectionInfo('testid:submit', 0, 2);
    expect(first).toContain('>> nth=0');
    const second = await tool.selectionInfo('testid:cancel', 0, 3);
    expect(second).toContain('using element 1');
    expect(second).not.toContain('>> nth=0');
    expect(second).not.toContain('Test IDs should be unique');
  });

  test('formatElementSelectionInfo verbose hint reappears after browser state reset', async () => {
    const { resetBrowserState } = await import('../toolHandler.js');
    resetBrowserState();
    await tool.selectionInfo('testid:a', 0, 2);
    resetBrowserState();
    const after = await tool.selectionInfo('testid:b', 0, 2);
    expect(after).toContain('>> nth=0');
  });

  test('formatElementSelectionInfo omits extras when only one element matches', async () => {
    const info = await tool.selectionInfo('text=Unique Button', 0, 1);
    expect(info).toBe('');
  });

  test('selectPreferredLocator errorOnMultiple emits verbose guidance on first call only', async () => {
    const { resetBrowserState } = await import('../toolHandler.js');
    resetBrowserState();

    const first = await tool.runErrorOnMultiple(3, 'testid:submit');
    expect(first).toContain('matched 3 elements');
    expect(first).toContain('Preferred: add a unique data-testid');
    expect(first).toContain('append `>> nth=<index>`');
    expect(first).toContain('Matches:');

    const second = await tool.runErrorOnMultiple(2, 'testid:cancel');
    expect(second).toContain('matched 2 elements');
    // Verbose guidance suppressed — only one-line pointer remains.
    expect(second).not.toContain('Preferred: add a unique data-testid');
    expect(second).toContain("Use a more specific selector");
    // Per-call match details still emitted.
    expect(second).toContain('Matches:');
  });

  test('selectPreferredLocator errorOnMultiple verbose guidance reappears after browser reset', async () => {
    const { resetBrowserState } = await import('../toolHandler.js');
    resetBrowserState();
    await tool.runErrorOnMultiple(2, 'testid:a');
    resetBrowserState();
    const after = await tool.runErrorOnMultiple(2, 'testid:b');
    expect(after).toContain('Preferred: add a unique data-testid');
  });
});

describe('BrowserToolBase selector normalization', () => {
  const tool = new ExposedBrowserToolBase();

  describe('testid shortcuts', () => {
    test('converts testid: shortcut', () => {
      expect(tool.normalize('testid:submit-button')).toBe('[data-testid="submit-button"]');
    });

    test('supports combined selector after testid shortcut', () => {
      expect(tool.normalize('testid:chat-buttons button:first-child')).toBe(
        '[data-testid="chat-buttons"] button:first-child',
      );
    });

    test('supports combined selector with newline after testid shortcut', () => {
      const input = 'testid:chat-buttons\n                                 button:first-child';
      const expected = '[data-testid="chat-buttons"]\n                                 button:first-child';
      expect(tool.normalize(input)).toBe(expected);
    });

    test('converts data-test: shortcut', () => {
      expect(tool.normalize('data-test:login-form')).toBe('[data-test="login-form"]');
    });

    test('converts data-cy: shortcut', () => {
      expect(tool.normalize('data-cy:username')).toBe('[data-cy="username"]');
    });
  });

  describe('escape character normalization', () => {
    test('preserves single backslash before brackets', () => {
      expect(tool.normalize('.top-\\[36px\\]')).toBe('.top-\\[36px\\]');
    });

    test('collapses double backslashes before brackets to single', () => {
      expect(tool.normalize('.top-\\\\[36px\\\\]')).toBe('.top-\\[36px\\]');
    });

    test('preserves single backslash before colon', () => {
      expect(tool.normalize('.dark\\:bg-gray-700')).toBe('.dark\\:bg-gray-700');
    });

    test('collapses multiple backslashes before colon to single', () => {
      expect(tool.normalize('.flex-1.border-b.dark\\\\:border-gray-700')).toBe('.flex-1.border-b.dark\\:border-gray-700');
    });

    test('collapses extra escapes and preserves required ones', () => {
      expect(tool.normalize('.sticky.top-\\\\[36px\\\\].z-30')).toBe('.sticky.top-\\[36px\\].z-30');
    });

    test('preserves escapes for multiple colons and bracket values', () => {
      expect(tool.normalize('.dark\\:hover\\:bg-\\[#333\\]')).toBe('.dark\\:hover\\:bg-\\[#333\\]');
    });

    test('collapses triple or more backslashes to single', () => {
      expect(tool.normalize('.class-\\\\\\[value\\\\\\]')).toBe('.class-\\[value\\]');
    });
  });

  describe('pass through unaffected selectors', () => {
    test('passes through regular class selectors', () => {
      expect(tool.normalize('.my-class')).toBe('.my-class');
    });

    test('passes through ID selectors', () => {
      expect(tool.normalize('#my-id')).toBe('#my-id');
    });

    test('passes through attribute selectors', () => {
      expect(tool.normalize('[data-value="test"]')).toBe('[data-value="test"]');
    });

    test('passes through text selectors', () => {
      expect(tool.normalize('text=Click me')).toBe('text=Click me');
    });

    test('passes through complex unescaped selectors', () => {
      expect(tool.normalize('.dark:bg-gray-700.hover:bg-blue-500')).toBe('.dark:bg-gray-700.hover:bg-blue-500');
    });

    test('passes through selectors with actual bracket values (already valid CSS)', () => {
      expect(tool.normalize('.top-[36px]')).toBe('.top-[36px]');
    });
  });

  describe('edge cases', () => {
    test('handles empty selector', () => {
      expect(tool.normalize('')).toBe('');
    });

    test('handles selector with only backslashes', () => {
      // Backslashes are only removed when followed by [ ] or :
      // Standalone backslashes pass through unchanged (edge case, invalid selector)
      expect(tool.normalize('\\\\')).toBe('\\\\');
    });

    test('handles mixed testid shortcut with escaped characters', () => {
      // Testid shortcuts are processed first, so escapes in the value are preserved
      expect(tool.normalize('testid:my-button')).toBe('[data-testid="my-button"]');
    });
  });

  describe('ID selector handling', () => {
    test('keeps simple IDs unchanged', () => {
      expect(tool.normalize('#simple-id')).toBe('#simple-id');
    });

    test('switches ID with special chars to id= engine', () => {
      expect(tool.normalize('#radix-\\:rc\\:-content-123')).toBe('id=radix-:rc:-content-123');
    });

    test('does not switch when ID is part of a compound selector', () => {
      expect(tool.normalize('#radix-\\:rc\\:-content-123 .child')).toBe('#radix-\\:rc\\:-content-123 .child');
    });

    test('preserves Tailwind width class bracket escapes in compound class selector', () => {
      const input = '.flex.min-w-\\[280px\\].max-w-\\[480px\\]';
      expect(tool.normalize(input)).toBe(input);
    });
  });

  describe('error sanitization', () => {
    const tool = new ExposedBrowserToolBase();

    test('removes stack frames and keeps concise message', () => {
      const raw = "locator.count: SyntaxError: Failed to execute 'querySelectorAll' on 'Document': '#bad:selector' is not a valid selector.\n    at query (<anonymous>:4989:41)\n    at <anonymous>:4999:7\n    at SelectorEvaluatorImpl._cached (<anonymous>:4776:20)";
      const sanitized = tool.sanitize(raw);
      expect(sanitized).toContain("is not a valid selector");
      expect(sanitized).not.toContain("at query (");
      expect(sanitized).not.toContain("<anonymous>:");
    });
  });
});
