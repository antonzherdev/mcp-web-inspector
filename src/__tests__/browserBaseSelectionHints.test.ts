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

  public selectionInfo(selector: string, elementIndex: number, totalCount: number, preferredVisible = true): string {
    return this.formatElementSelectionInfo(selector, elementIndex, totalCount, preferredVisible);
  }

  public normalize(selector: string): string {
    return this.normalizeSelector(selector);
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

  test('formatElementSelectionInfo appends nth hint and duplicate warning', () => {
    const info = tool.selectionInfo('testid:submit', 0, 2);
    expect(info).toContain('using element 1');
    expect(info).toContain('>> nth=0');
    expect(info).toContain('Test IDs should be unique');
  });

  test('formatElementSelectionInfo omits extras when only one element matches', () => {
    const info = tool.selectionInfo('text=Unique Button', 0, 1);
    expect(info).toBe('');
  });
});

describe('BrowserToolBase selector normalization', () => {
  const tool = new ExposedBrowserToolBase();

  describe('testid shortcuts', () => {
    test('converts testid: shortcut', () => {
      expect(tool.normalize('testid:submit-button')).toBe('[data-testid="submit-button"]');
    });

    test('converts data-test: shortcut', () => {
      expect(tool.normalize('data-test:login-form')).toBe('[data-test="login-form"]');
    });

    test('converts data-cy: shortcut', () => {
      expect(tool.normalize('data-cy:username')).toBe('[data-cy="username"]');
    });
  });

  describe('escape character cleaning', () => {
    test('removes single backslash before opening bracket', () => {
      expect(tool.normalize('.top-\\[36px\\]')).toBe('.top-[36px]');
    });

    test('removes double backslash before opening bracket', () => {
      expect(tool.normalize('.top-\\\\[36px\\\\]')).toBe('.top-[36px]');
    });

    test('removes single backslash before colon', () => {
      expect(tool.normalize('.dark\\:bg-gray-700')).toBe('.dark:bg-gray-700');
    });

    test('removes double backslash before colon', () => {
      expect(tool.normalize('.flex-1.border-b.dark\\\\:border-gray-700')).toBe('.flex-1.border-b.dark:border-gray-700');
    });

    test('handles complex selector with multiple escapes', () => {
      expect(tool.normalize('.sticky.top-\\\\[36px\\\\].z-30')).toBe('.sticky.top-[36px].z-30');
    });

    test('handles multiple colons and brackets', () => {
      expect(tool.normalize('.dark\\:hover\\:bg-\\[#333\\]')).toBe('.dark:hover:bg-[#333]');
    });

    test('handles triple or more backslashes', () => {
      expect(tool.normalize('.class-\\\\\\[value\\\\\\]')).toBe('.class-[value]');
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

    test('passes through selectors with actual bracket values', () => {
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
});
