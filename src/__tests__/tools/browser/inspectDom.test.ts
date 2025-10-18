import { InspectDomTool } from '../../../tools/browser/inspectDom.js';
import { ToolContext } from '../../../tools/common/types.js';
import { Page, Browser } from 'playwright';
import { jest } from '@jest/globals';

// Mock Page
const mockPageEvaluate = jest.fn() as jest.MockedFunction<(pageFunction: any, arg?: any) => Promise<any>>;
const mockIsClosed = jest.fn().mockReturnValue(false);

const mockPage = {
  evaluate: mockPageEvaluate,
  isClosed: mockIsClosed,
} as unknown as Page;

// Mock Browser
const mockIsConnected = jest.fn().mockReturnValue(true);
const mockBrowser = {
  isConnected: mockIsConnected,
} as unknown as Browser;

// Mock Server
const mockServer = {
  sendMessage: jest.fn(),
};

// Mock Context
const mockContext = {
  page: mockPage,
  browser: mockBrowser,
  server: mockServer,
} as ToolContext;

describe('InspectDomTool', () => {
  let inspectDomTool: InspectDomTool;

  beforeEach(() => {
    jest.clearAllMocks();
    inspectDomTool = new InspectDomTool(mockServer);
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
  });

  test('should inspect page with semantic elements', async () => {
    const args = {};

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'body',
        selector: 'body',
        position: { x: 0, y: 0, width: 1200, height: 800 },
        isVisible: true,
      },
      children: [
        {
          tag: 'header',
          selector: 'header',
          text: 'My Website',
          position: { x: 0, y: 0, width: 1200, height: 60 },
          isVisible: true,
          isInteractive: false,
          childCount: 2,
        },
        {
          tag: 'main',
          selector: 'main',
          testId: 'main-content',
          text: 'Welcome to my site',
          position: { x: 0, y: 60, width: 1200, height: 600 },
          isVisible: true,
          isInteractive: false,
          childCount: 3,
        },
      ],
      stats: {
        totalChildren: 5,
        semanticCount: 2,
        shownCount: 2,
        omittedCount: 0,
        skippedWrappers: 3,
      },
      layoutPattern: 'vertical',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('DOM Inspection: <body');
    expect(result.content[0].text).toContain('[0] <header');
    expect(result.content[0].text).toContain('[1] <main data-testid="main-content">');
    expect(result.content[0].text).toContain('Children (2 of 2, skipped 3 wrappers)');
    expect(result.content[0].text).toContain('Layout: vertical');
  });

  test('should handle page with no semantic elements', async () => {
    const args = { selector: '.wrapper' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'div',
        selector: 'div.wrapper',
        position: { x: 0, y: 0, width: 1200, height: 800 },
        isVisible: true,
      },
      children: [],
      stats: {
        totalChildren: 12,
        semanticCount: 0,
        shownCount: 0,
        omittedCount: 0,
        skippedWrappers: 12,
      },
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('⚠ No semantic elements found');
    expect(result.content[0].text).toContain('Suggestions:');
    expect(result.content[0].text).toContain('playwright_get_visible_html');
    expect(result.content[0].text).toContain('Adding semantic HTML');
  });

  test('should handle element with testid selector', async () => {
    const args = { selector: 'testid:login-form' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'form',
        selector: '[data-testid="login-form"]',
        position: { x: 100, y: 100, width: 400, height: 300 },
        isVisible: true,
      },
      children: [
        {
          tag: 'input',
          selector: '[data-testid="username"]',
          testId: 'username',
          text: '',
          position: { x: 120, y: 120, width: 360, height: 40 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
        {
          tag: 'button',
          selector: 'button.submit',
          text: 'Sign In',
          position: { x: 120, y: 180, width: 100, height: 40 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
      ],
      stats: {
        totalChildren: 2,
        semanticCount: 2,
        shownCount: 2,
        omittedCount: 0,
        skippedWrappers: 0,
      },
      layoutPattern: 'vertical',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(mockPageEvaluate).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ sel: '[data-testid="login-form"]' })
    );
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('<input data-testid="username">');
    expect(result.content[0].text).toContain('⚡ interactive');
  });

  test('should limit children shown with maxChildren', async () => {
    const args = { maxChildren: 2 };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'ul',
        selector: 'ul',
        position: { x: 0, y: 0, width: 300, height: 500 },
        isVisible: true,
      },
      children: [
        {
          tag: 'li',
          selector: 'li',
          text: 'Item 1',
          position: { x: 0, y: 0, width: 300, height: 30 },
          isVisible: true,
          isInteractive: false,
          childCount: 0,
        },
        {
          tag: 'li',
          selector: 'li',
          text: 'Item 2',
          position: { x: 0, y: 30, width: 300, height: 30 },
          isVisible: true,
          isInteractive: false,
          childCount: 0,
        },
      ],
      stats: {
        totalChildren: 10,
        semanticCount: 10,
        shownCount: 2,
        omittedCount: 8,
        skippedWrappers: 0,
      },
      layoutPattern: 'vertical',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Children (2 of 10)');
    expect(result.content[0].text).toContain('8 more semantic children omitted');
  });

  test('should handle includeHidden parameter', async () => {
    const args = { includeHidden: true };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'body',
        selector: 'body',
        position: { x: 0, y: 0, width: 1200, height: 800 },
        isVisible: true,
      },
      children: [
        {
          tag: 'div',
          selector: 'div.hidden',
          testId: 'hidden-panel',
          text: 'Hidden content',
          position: { x: 0, y: 0, width: 0, height: 0 },
          isVisible: false,
          isInteractive: false,
          childCount: 1,
        },
      ],
      stats: {
        totalChildren: 3,
        semanticCount: 1,
        shownCount: 1,
        omittedCount: 0,
        skippedWrappers: 2,
      },
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(mockPageEvaluate).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ hidden: true })
    );
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('✗ hidden');
  });

  test('should show layout pattern detection', async () => {
    const args = { selector: 'nav' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'nav',
        selector: 'nav',
        position: { x: 0, y: 0, width: 1200, height: 50 },
        isVisible: true,
      },
      children: [
        {
          tag: 'a',
          selector: 'a',
          text: 'Home',
          position: { x: 20, y: 15, width: 60, height: 20 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
        {
          tag: 'a',
          selector: 'a',
          text: 'About',
          position: { x: 100, y: 15, width: 60, height: 20 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
      ],
      stats: {
        totalChildren: 2,
        semanticCount: 2,
        shownCount: 2,
        omittedCount: 0,
        skippedWrappers: 0,
      },
      layoutPattern: 'horizontal',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Layout: horizontal');
    expect(result.content[0].text).toContain('→');
    expect(result.content[0].text).toContain('horizontal layout');
  });

  test('should return error when element not found', async () => {
    const args = { selector: '#non-existent' };

    mockPageEvaluate.mockResolvedValue({
      error: 'Element not found: #non-existent',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Element not found');
  });

  test('should handle missing page', async () => {
    const args = {};
    const contextWithoutPage = {
      browser: mockBrowser,
      server: mockServer,
    } as unknown as ToolContext;

    const result = await inspectDomTool.execute(args, contextWithoutPage);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser page not initialized');
  });

  test('should handle disconnected browser', async () => {
    const args = {};
    mockIsConnected.mockReturnValue(false);

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('disconnected');
  });

  test('should handle closed page', async () => {
    const args = {};
    mockIsClosed.mockReturnValue(true);

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('closed');
  });

  test('should show mixed structure tip', async () => {
    const args = {};

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'body',
        selector: 'body',
        position: { x: 0, y: 0, width: 1200, height: 800 },
        isVisible: true,
      },
      children: [
        {
          tag: 'button',
          selector: 'button',
          text: 'Click me',
          position: { x: 100, y: 100, width: 120, height: 40 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
      ],
      stats: {
        totalChildren: 10,
        semanticCount: 1,
        shownCount: 1,
        omittedCount: 0,
        skippedWrappers: 9,
      },
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('💡 Tip: Some elements found, but 9 wrapper divs were skipped');
  });

  test('should handle evaluation error gracefully', async () => {
    const args = {};

    mockPageEvaluate.mockRejectedValue(new Error('JavaScript execution failed'));

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to inspect DOM');
  });
});
