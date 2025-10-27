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
