import { InspectDomTool } from '../inspect_dom.js';
import { ToolContext } from '../../../common/types.js';
import { Page, Browser } from 'playwright';
import { jest } from '@jest/globals';

// Mock Locator
const mockLocatorIsVisible = jest.fn<() => Promise<boolean>>();
const mockLocatorEvaluate = jest.fn<(pageFunction: any, arg?: any) => Promise<any>>();
const mockLocatorFirst = jest.fn();
const mockLocatorNth = jest.fn();
const mockLocatorCount = jest.fn<() => Promise<number>>();

const createMockLocator = () => ({
  isVisible: mockLocatorIsVisible,
  evaluate: mockLocatorEvaluate,
  first: mockLocatorFirst,
  nth: mockLocatorNth,
  count: mockLocatorCount,
});

// Mock Page
const mockPageEvaluate = jest.fn() as jest.MockedFunction<(pageFunction: any, arg?: any) => Promise<any>>;
const mockIsClosed = jest.fn().mockReturnValue(false);
const mockPageLocator = jest.fn();

const mockPage = {
  evaluate: mockPageEvaluate,
  isClosed: mockIsClosed,
  locator: mockPageLocator,
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

    // Setup default locator behavior - single visible element
    const mockLoc = createMockLocator();
    mockPageLocator.mockReturnValue(mockLoc);
    mockLocatorCount.mockResolvedValue(1);
    mockLocatorFirst.mockReturnValue(mockLoc);
    mockLocatorNth.mockReturnValue(mockLoc);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate.mockImplementation(mockPageEvaluate);
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

  test('should show centering information in offset', async () => {
    const args = { selector: 'header' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'header',
        selector: 'header',
        position: { x: 0, y: 0, width: 1200, height: 56 },
        isVisible: true,
      },
      children: [
        {
          tag: 'div',
          selector: '[data-testid="title"]',
          testId: 'title',
          text: 'My App',
          position: { x: 16, y: 14, width: 100, height: 28 }, // Centered vertically: (56-28)/2 = 14
          isVisible: true,
          isInteractive: false,
          childCount: 0,
        },
        {
          tag: 'div',
          selector: '[data-testid="subtitle"]',
          testId: 'subtitle',
          text: 'Not Centered',
          position: { x: 200, y: 2, width: 100, height: 28 }, // NOT centered: should be 14, is 2
          isVisible: true,
          isInteractive: false,
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

    // First child at (16, 14) in 1200x56 parent
    // Left: 16, Right: 1200-16-100=1084, Top: 14, Bottom: 56-14-28=14
    // Top and bottom are equal (14 = 14), so vertically centered (obvious from output)
    expect(result.content[0].text).toContain('from edges: ←16px →1084px ↑14px ↓14px');

    // Second child at (200, 2) in 1200x56 parent
    // Left: 200, Right: 1200-200-100=900, Top: 2, Bottom: 56-2-28=26
    // Top and bottom NOT equal (2 ≠ 26), so NOT vertically centered (obvious from output)
    expect(result.content[0].text).toContain('from edges: ←200px →900px ↑2px ↓26px');
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
      elementCounts: {},
      interactiveCounts: {},
      treeCounts: null,
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Children (0 semantic');
    expect(result.content[0].text).toContain('⚠ No semantic or interactive descendants surfaced at this level.');
    expect(result.content[0].text).toContain('Next steps:');
    expect(result.content[0].text).toContain('Re-run inspect_dom({ selector: ".wrapper", maxDepth: 8 })');
    expect(result.content[0].text).toContain('Use get_visible_html({ selector: ".wrapper" })');
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

    // Verify locator was used to find the element
    expect(mockPageLocator).toHaveBeenCalledWith('[data-testid="login-form"]');
    expect(mockLocatorEvaluate).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ hidden: false })
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

    expect(mockLocatorEvaluate).toHaveBeenCalledWith(
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
    expect(result.content[0].text).toContain('💡 Tip: Some elements found, but 9 wrapper containers were skipped');
  });

  test('should not show wrapper tip when only one wrapper is skipped', async () => {
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
        totalChildren: 5,
        semanticCount: 1,
        shownCount: 1,
        omittedCount: 0,
        skippedWrappers: 1,
      },
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).not.toContain('wrapper container was skipped');
    expect(result.content[0].text).not.toContain('wrapper containers were skipped');
  });

  test('should handle evaluation error gracefully', async () => {
    const args = {};

    mockPageEvaluate.mockRejectedValue(new Error('JavaScript execution failed'));

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to inspect DOM');
  });

  test('should show interactive element summary when no semantic elements', async () => {
    const args = { selector: '.container' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'div',
        selector: 'div.container',
        position: { x: 0, y: 0, width: 800, height: 600 },
        isVisible: true,
      },
      children: [],
      stats: {
        totalChildren: 20,
        semanticCount: 0,
        shownCount: 0,
        omittedCount: 0,
        skippedWrappers: 20,
      },
      elementCounts: { div: 15, span: 5 },
      interactiveCounts: { button: 3, a: 2, input: 1 },
      treeCounts: null,
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Interactive elements exist deeper in the tree:');
    expect(result.content[0].text).toContain('3 buttons');
    expect(result.content[0].text).toContain('2 links');
    expect(result.content[0].text).toContain('1 input');
    expect(result.content[0].text).toContain('Increase maxDepth or drill down with more specific selectors.');
  });

  test('should show page overview for top-level containers', async () => {
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
          text: 'Site Header',
          position: { x: 0, y: 0, width: 1200, height: 60 },
          isVisible: true,
          isInteractive: false,
          childCount: 3,
        },
      ],
      stats: {
        totalChildren: 10,
        semanticCount: 1,
        shownCount: 1,
        omittedCount: 0,
        skippedWrappers: 9,
      },
      elementCounts: { div: 9, header: 1 },
      interactiveCounts: { button: 5, a: 3 },
      treeCounts: {
        counts: { header: 1, nav: 1, main: 1, button: 5, a: 3, input: 2, form: 1 },
        interactiveCounts: { button: 5, a: 3, input: 2 },
        testIdCount: 4,
      },
      layoutPattern: 'vertical',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Page Overview:');
    expect(result.content[0].text).toContain('Structure: 1 header, 1 nav, 1 main');
    expect(result.content[0].text).toContain('Interactive: 5 buttons, 3 links, 2 inputs');
    expect(result.content[0].text).toContain('Forms: 1 form with 2 inputs');
    expect(result.content[0].text).toContain('Test Coverage: 4 elements with test IDs');
  });

  test('should handle dashboard with many buttons (Test 2 from assessment)', async () => {
    const args = { selector: 'testid:main-layout' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'div',
        selector: '[data-testid="main-layout"]',
        position: { x: 256, y: 0, width: 640, height: 768 },
        isVisible: true,
      },
      children: [],
      stats: {
        totalChildren: 76,
        semanticCount: 0,
        shownCount: 0,
        omittedCount: 0,
        skippedWrappers: 76,
      },
      elementCounts: { div: 19, span: 57 },
      interactiveCounts: { button: 57, a: 12, input: 3 },
      treeCounts: null,
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Interactive elements exist deeper in the tree:');
    expect(result.content[0].text).toContain('57 buttons');
    expect(result.content[0].text).toContain('12 links');
    expect(result.content[0].text).toContain('3 inputs');
    expect(result.content[0].text).toContain('Increase maxDepth or drill down with more specific selectors.');
    // Should NOT say "No semantic or interactive elements found"
    expect(result.content[0].text).not.toContain('⚠ No semantic or interactive elements found');
  });

  test('should handle header with buttons inside (Test 3 from assessment)', async () => {
    const args = { selector: 'header' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'header',
        selector: 'header',
        position: { x: 256, y: 0, width: 640, height: 64 },
        isVisible: true,
      },
      children: [],
      stats: {
        totalChildren: 5,
        semanticCount: 0,
        shownCount: 0,
        omittedCount: 0,
        skippedWrappers: 5,
      },
      elementCounts: { div: 3, span: 2 },
      interactiveCounts: { button: 3 },
      treeCounts: null,
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Interactive elements exist deeper in the tree:');
    expect(result.content[0].text).toContain('3 buttons');
    expect(result.content[0].text).toContain('Increase maxDepth or drill down with more specific selectors.');
  });

  test('should show both semantic and interactive counts when mixed', async () => {
    const args = { selector: '.form-container' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'div',
        selector: 'div.form-container',
        position: { x: 100, y: 100, width: 600, height: 400 },
        isVisible: true,
      },
      children: [
        {
          tag: 'form',
          selector: 'form',
          text: '',
          position: { x: 100, y: 100, width: 600, height: 400 },
          isVisible: true,
          isInteractive: false,
          childCount: 8,
        },
      ],
      stats: {
        totalChildren: 20,
        semanticCount: 1,
        shownCount: 1,
        omittedCount: 0,
        skippedWrappers: 19,
      },
      elementCounts: { div: 15, form: 1, span: 4 },
      interactiveCounts: { button: 2, input: 5 },
      treeCounts: null,
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('[0] <form');
    expect(result.content[0].text).toContain('💡 Tip: Some elements found, but 19 wrapper containers were skipped');
  });

  test('should handle selector normalization for testid shorthand', async () => {
    const args = { selector: 'testid:login-button' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'button',
        selector: '[data-testid="login-button"]',
        position: { x: 200, y: 300, width: 120, height: 40 },
        isVisible: true,
      },
      children: [],
      stats: {
        totalChildren: 0,
        semanticCount: 0,
        shownCount: 0,
        omittedCount: 0,
        skippedWrappers: 0,
      },
      elementCounts: {},
      interactiveCounts: {},
      treeCounts: null,
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    // Verify locator was used to find the element
    expect(mockPageLocator).toHaveBeenCalledWith('[data-testid="login-button"]');
    expect(mockLocatorEvaluate).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ hidden: false })
    );
    expect(result.isError).toBe(false);
  });

  test('should count multiple element types correctly', async () => {
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
          text: 'Header',
          position: { x: 0, y: 0, width: 1200, height: 60 },
          isVisible: true,
          isInteractive: false,
          childCount: 0,
        },
        {
          tag: 'nav',
          selector: 'nav',
          text: 'Navigation',
          position: { x: 0, y: 60, width: 200, height: 740 },
          isVisible: true,
          isInteractive: false,
          childCount: 5,
        },
      ],
      stats: {
        totalChildren: 5,
        semanticCount: 2,
        shownCount: 2,
        omittedCount: 0,
        skippedWrappers: 3,
      },
      elementCounts: { div: 3, header: 1, nav: 1 },
      interactiveCounts: { button: 10, a: 5, input: 2, select: 1 },
      treeCounts: {
        counts: {
          header: 2,
          nav: 1,
          main: 1,
          section: 3,
          button: 10,
          a: 5,
          input: 2,
          select: 1,
          textarea: 1,
        },
        interactiveCounts: { button: 10, a: 5, input: 2, select: 1, textarea: 1 },
        testIdCount: 8,
      },
      layoutPattern: 'vertical',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Page Overview:');
    expect(result.content[0].text).toContain('2 headers');
    expect(result.content[0].text).toContain('3 sections');
    expect(result.content[0].text).toContain('10 buttons');
    expect(result.content[0].text).toContain('5 links');
    expect(result.content[0].text).toContain('Test Coverage: 8 elements');
  });

  test('should show interactive summary for nested elements in wrapper divs', async () => {
    // This is the header scenario from reassessment Test 5
    const args = { selector: 'testid:main-header' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'header',
        selector: '[data-testid="main-header"]',
        position: { x: 256, y: 0, width: 640, height: 64 },
        isVisible: true,
      },
      children: [],
      stats: {
        totalChildren: 1,
        semanticCount: 0,
        shownCount: 0,
        omittedCount: 0,
        skippedWrappers: 1,
      },
      elementCounts: { div: 1 },
      // After fix: interactiveCounts now includes elements found in wrapper div's subtree
      interactiveCounts: { button: 5, input: 1 },
      treeCounts: null,
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);

    // Should now show interactive elements summary
    expect(result.content[0].text).toContain('Interactive elements exist deeper in the tree:');
    expect(result.content[0].text).toContain('5 buttons');
    expect(result.content[0].text).toContain('1 input');
    expect(result.content[0].text).toContain('Increase maxDepth or drill down with more specific selectors.');
  });

  test('should count interactive elements in wrapper div children', async () => {
    // Simulates the form scenario where inputs are nested in wrapper divs
    const args = { selector: 'form' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'form',
        selector: 'form',
        position: { x: 441, y: 271, width: 398, height: 184 },
        isVisible: true,
      },
      children: [
        {
          tag: 'button',
          selector: 'button',
          text: 'Login',
          position: { x: 441, y: 419, width: 398, height: 36 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
      ],
      stats: {
        totalChildren: 3,
        semanticCount: 1,
        shownCount: 1,
        omittedCount: 0,
        skippedWrappers: 2,
      },
      elementCounts: { div: 2, button: 1 },
      // After fix: Now counts the button AND the 2 inputs nested in wrapper divs
      interactiveCounts: { button: 1, input: 2 },
      treeCounts: null,
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);

    // Shows both the direct button child AND the nested inputs without adding noisy wrapper warnings
    expect(result.content[0].text).not.toContain('wrapper containers were skipped');
    // The button is shown as a direct child
    expect(result.content[0].text).toContain('[0] <button');
  });

  test('should provide drill-down suggestions when Page Overview shows interactive but Children shows none', async () => {
    // Dashboard scenario: Page Overview shows 57 buttons, but Children shows 0 semantic
    const args = { selector: 'testid:main-layout' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'div',
        selector: '[data-testid="main-layout"]',
        position: { x: 0, y: 0, width: 1200, height: 800 },
        isVisible: true,
      },
      children: [],
      stats: {
        totalChildren: 20,
        semanticCount: 0,
        shownCount: 0,
        omittedCount: 0,
        skippedWrappers: 20,
      },
      elementCounts: { div: 20 },
      interactiveCounts: {}, // Empty because all immediate children are wrappers
      treeCounts: {
        counts: { div: 50, button: 57, input: 2, textarea: 1, header: 2 },
        interactiveCounts: { button: 57, input: 2, textarea: 1 },
        testIdCount: 4,
      },
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);

    // Should show Page Overview with the tree counts
    expect(result.content[0].text).toContain('Page Overview:');
    expect(result.content[0].text).toContain('57 buttons');

    // Should suggest specific ways to access those 57 buttons
    expect(result.content[0].text).toContain('Selectors to surface known interactive elements:');
    expect(result.content[0].text).toContain('inspect_dom({ selector: "testid:main-layout button" })');
    expect(result.content[0].text).toContain('inspect_dom({ selector: "testid:main-layout input" })');
  });

  test('should drill through wrapper divs to show nested semantic children', async () => {
    // Real-world scenario: header > div > buttons
    // The recursive logic now drills through the wrapper div to find the buttons
    const args = { selector: 'header' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'header',
        selector: 'header',
        position: { x: 0, y: 0, width: 1200, height: 64 },
        isVisible: true,
      },
      // After fix: The buttons found by drilling through the wrapper
      children: [
        {
          tag: 'button',
          selector: 'button',
          text: 'Menu',
          position: { x: 10, y: 12, width: 40, height: 40 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
        {
          tag: 'button',
          selector: 'button',
          text: 'Search',
          position: { x: 60, y: 12, width: 40, height: 40 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
        {
          tag: 'button',
          selector: 'button',
          text: 'Settings',
          position: { x: 110, y: 12, width: 40, height: 40 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
      ],
      stats: {
        totalChildren: 1,
        semanticCount: 3,  // Found 3 semantic children by drilling through wrapper
        shownCount: 3,
        omittedCount: 0,
        skippedWrappers: 1,  // Still counted the wrapper as skipped
      },
      elementCounts: { div: 1 },
      interactiveCounts: { button: 3 },
      treeCounts: null,
      layoutPattern: 'horizontal',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);

    // Should now show the 3 buttons that were found by drilling through the wrapper
    expect(result.content[0].text).toContain('Children (3');
    expect(result.content[0].text).toContain('[0] <button');
    expect(result.content[0].text).toContain('[1] <button');
    expect(result.content[0].text).toContain('[2] <button');
    expect(result.content[0].text).toContain('⚡ interactive');
    expect(result.content[0].text).toContain('skipped 1 wrapper');
  });

  test('should drill through ANY non-semantic wrapper, not just div/span', async () => {
    // Edge case: <fieldset> is NOT in semanticTags, so it should be drilled through
    const args = { selector: 'form' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'form',
        selector: 'form',
        position: { x: 0, y: 0, width: 400, height: 300 },
        isVisible: true,
      },
      // Buttons nested in a <fieldset> wrapper (which is NOT in semanticTags)
      children: [
        {
          tag: 'button',
          selector: 'button',
          text: 'Submit',
          position: { x: 10, y: 250, width: 100, height: 40 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
        {
          tag: 'button',
          selector: 'button',
          text: 'Cancel',
          position: { x: 120, y: 250, width: 100, height: 40 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
      ],
      stats: {
        totalChildren: 1,
        semanticCount: 2,  // Found 2 buttons by drilling through fieldset
        shownCount: 2,
        omittedCount: 0,
        skippedWrappers: 1,  // The fieldset wrapper
      },
      elementCounts: { fieldset: 1 },
      interactiveCounts: { button: 2 },  // Counted as we found them
      treeCounts: null,
      layoutPattern: 'horizontal',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);

    // Should drill through fieldset (non-semantic) to find buttons
    expect(result.content[0].text).toContain('Children (2');
    expect(result.content[0].text).toContain('[0] <button');
    expect(result.content[0].text).toContain('[1] <button');
    expect(result.content[0].text).toContain('skipped 1 wrapper');
  });

  test('should NOT drill through semantic containers like section/article', async () => {
    // Important: semantic containers should be shown, not drilled through
    const args = { selector: 'main' };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'main',
        selector: 'main',
        position: { x: 0, y: 0, width: 1200, height: 800 },
        isVisible: true,
      },
      // Section is semantic - show it, don't drill through
      children: [
        {
          tag: 'section',
          selector: 'section',
          text: 'Content section with buttons inside',
          position: { x: 0, y: 0, width: 1200, height: 400 },
          isVisible: true,
          isInteractive: false,
          childCount: 5,  // Has children but we don't drill through
        },
        {
          tag: 'article',
          selector: 'article',
          text: 'Article content',
          position: { x: 0, y: 400, width: 1200, height: 400 },
          isVisible: true,
          isInteractive: false,
          childCount: 3,
        },
      ],
      stats: {
        totalChildren: 2,
        semanticCount: 2,
        shownCount: 2,
        omittedCount: 0,
        skippedWrappers: 0,  // No wrappers, both children are semantic
      },
      elementCounts: { section: 1, article: 1 },
      interactiveCounts: {},
      treeCounts: null,
      layoutPattern: 'vertical',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);

    // Should show section and article, NOT drill through them
    expect(result.content[0].text).toContain('Children (2 of 2');
    expect(result.content[0].text).toContain('[0] <section');
    expect(result.content[0].text).toContain('[1] <article');
    expect(result.content[0].text).not.toContain('skipped');
  });

  test('should respect custom maxDepth parameter for deep nesting', async () => {
    // Pathological case: div > div > div > div > div > button
    // Default maxDepth=3 would stop, but maxDepth=5 should find it
    const args = { selector: 'header', maxDepth: 5 };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'header',
        selector: 'header',
        position: { x: 0, y: 0, width: 1200, height: 64 },
        isVisible: true,
      },
      // Button found at depth 5 (5 wrapper divs deep)
      children: [
        {
          tag: 'button',
          selector: 'button',
          text: 'Deep Button',
          position: { x: 10, y: 10, width: 100, height: 40 },
          isVisible: true,
          isInteractive: true,
          childCount: 0,
        },
      ],
      stats: {
        totalChildren: 1,
        semanticCount: 1,
        shownCount: 1,
        omittedCount: 0,
        skippedWrappers: 1,  // The top-level wrapper
      },
      elementCounts: { div: 1 },
      interactiveCounts: { button: 1 },
      treeCounts: null,
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);

    // Should find the button at depth 5
    expect(result.content[0].text).toContain('[0] <button');
    expect(result.content[0].text).toContain('Deep Button');
  });

  test('should stop at maxDepth=1 to prevent any drilling', async () => {
    // Use case: Only want immediate children, no drilling
    const args = { selector: 'header', maxDepth: 1 };

    mockPageEvaluate.mockResolvedValue({
      target: {
        tag: 'header',
        selector: 'header',
        position: { x: 0, y: 0, width: 1200, height: 64 },
        isVisible: true,
      },
      // With maxDepth=1, wrapper div is not drilled through
      // But we still count interactive elements in the wrapper for the summary
      children: [],
      stats: {
        totalChildren: 1,
        semanticCount: 0,
        shownCount: 0,
        omittedCount: 0,
        skippedWrappers: 1,
      },
      elementCounts: { div: 1 },
      interactiveCounts: {},  // Empty because maxDepth=1 prevents drilling to count them
      treeCounts: null,
      layoutPattern: 'unknown',
    });

    const result = await inspectDomTool.execute(args, mockContext);

    expect(result.isError).toBe(false);

    // Should NOT drill through the wrapper, so no children shown
    expect(result.content[0].text).toContain('Children (0 semantic');
    expect(result.content[0].text).toContain('skipped 1 wrapper');
  });
});
