import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { ClickTool } from '../click.js';
import type { ToolContext } from '../../../common/types.js';
import type { Page, Browser } from 'playwright';

function makeFakeLocator() {
  const elements = [
    {
      tagName: 'BUTTON',
      innerText: 'Cancel',
      textContent: 'Cancel',
      id: '',
      attrs: { 'data-testid': 'modal-cancel' },
      parent: { tagName: 'DIV', id: 'modal-footer', attrs: {}, parent: null },
    },
    {
      tagName: 'BUTTON',
      innerText: 'Cancel',
      textContent: 'Cancel',
      id: 'toolbar-cancel',
      attrs: {},
      parent: { tagName: 'DIV', id: 'toolbar', attrs: {}, parent: null },
    },
    {
      tagName: 'BUTTON',
      innerText: 'Cancel third',
      textContent: 'Cancel third',
      id: '',
      attrs: {},
      parent: { tagName: 'DIV', id: '', attrs: { 'data-test': 'footer' }, parent: null },
    },
  ];

  const wrap = (el: any) => ({
    evaluate: (fn: (node: any) => any) => {
      const toDomEl = (src: any): any => ({
        tagName: src.tagName,
        innerText: src.innerText,
        textContent: src.textContent,
        id: src.id,
        getAttribute: (name: string) => src.attrs[name] ?? null,
        parentElement: src.parent
          ? {
              tagName: src.parent.tagName,
              id: src.parent.id,
              getAttribute: (name: string) => src.parent.attrs[name] ?? null,
              parentElement: src.parent.parent,
            }
          : null,
      });
      return fn(toDomEl(el));
    },
  });

  return {
    count: async () => elements.length,
    nth: (i: number) => wrap(elements[i]),
  };
}

describe('ClickTool duplicate selection error formatting (integration)', () => {
  let clickTool: ClickTool;
  let mockPage: Page;
  let mockBrowser: Browser;
  let mockContext: ToolContext;

  const mockIsClosed = jest.fn().mockReturnValue(false);
  const mockIsConnected = jest.fn().mockReturnValue(true);
  const mockPageLocator = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clickTool = new ClickTool({});

    mockPage = {
      locator: mockPageLocator,
      isClosed: mockIsClosed,
    } as unknown as Page;

    mockBrowser = {
      isConnected: mockIsConnected,
    } as unknown as Browser;

    mockContext = {
      page: mockPage,
      browser: mockBrowser,
      server: {},
    } as unknown as ToolContext;
  });

  test('returns concise guidance and match options when multiple elements match', async () => {
    const fakeLocator = makeFakeLocator();
    mockPageLocator.mockReturnValue(fakeLocator);

    const res = await clickTool.execute({ selector: 'text=Cancel' }, mockContext);

    expect(res.isError).toBe(true);
    const text = res.content.map(c => c.text).join('\n');
    // Prefixed by "Operation failed: ..."
    expect(text).toContain('matched 3 elements');
    expect(text).toContain('1) Preferred: add a unique data-testid');
    expect(text).toContain('2) If you cannot change markup');
    expect(text).toContain('Matches:');
    expect(text).toContain('selector: testid:modal-cancel');
    expect(text).toContain('selector: id=toolbar-cancel');
    expect(text).toContain('selector: text=Cancel >> nth=2');

    // Ensure old verbose hints are not duplicated here
    expect(text).not.toContain('Primary fix: add a unique data-testid');
    expect(text).not.toContain('Workaround: Append');
  });
});

