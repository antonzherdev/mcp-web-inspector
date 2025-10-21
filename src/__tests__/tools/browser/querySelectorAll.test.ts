import { QuerySelectorAllTool } from '../../../tools/browser/querySelectorAll.js';
import { ToolContext } from '../../../tools/common/types.js';
import { Page, Browser, Locator } from 'playwright';
import { jest } from '@jest/globals';

// Mock Locator
const createMockLocator = (elements: any[]) => {
  const mockAll = jest.fn() as jest.MockedFunction<() => Promise<any[]>>;
  mockAll.mockResolvedValue(elements);

  return {
    all: mockAll,
  } as unknown as Locator;
};

// Mock element evaluate function
const createMockElement = (evaluateResult: any) => {
  const mockEvaluate = jest.fn() as jest.MockedFunction<(fn: any) => Promise<any>>;
  mockEvaluate.mockResolvedValue(evaluateResult);

  return {
    evaluate: mockEvaluate,
  };
};

// Mock Page
const mockPageLocator = jest.fn() as jest.MockedFunction<(selector: string) => Locator>;
const mockIsClosed = jest.fn().mockReturnValue(false);

const mockPage = {
  locator: mockPageLocator,
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

describe('QuerySelectorAllTool', () => {
  let querySelectorAllTool: QuerySelectorAllTool;

  beforeEach(() => {
    jest.clearAllMocks();
    querySelectorAllTool = new QuerySelectorAllTool(mockServer);
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
  });

  test('should find multiple visible elements with detailed info', async () => {
    const args = { selector: 'button.submit' };

    const mockElements = [
      createMockElement({
        tag: 'button',
        selector: 'data-testid="submit-main"',
        testId: 'submit-main',
        classes: 'submit.primary',
        text: 'Sign In',
        position: { x: 260, y: 100, width: 120, height: 40 },
        isVisible: true,
        isInteractive: true,
        opacity: 1,
        display: 'block',
      }),
      createMockElement({
        tag: 'button',
        selector: 'data-testid="submit-secondary"',
        testId: 'submit-secondary',
        classes: 'submit',
        text: 'Continue',
        position: { x: 400, y: 100, width: 120, height: 40 },
        isVisible: true,
        isInteractive: true,
        opacity: 1,
        display: 'block',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 2 elements matching "button.submit"');
    expect(result.content[0].text).toContain('[0] <button data-testid="submit-main">');
    expect(result.content[0].text).toContain('@ (260,100) 120x40px');
    expect(result.content[0].text).toContain('"Sign In"');
    expect(result.content[0].text).toContain('✓ visible');
    expect(result.content[0].text).toContain('⚡ interactive');
    expect(result.content[0].text).toContain('[1] <button data-testid="submit-secondary">');
    expect(result.content[0].text).toContain('"Continue"');
  });

  test('should handle hidden elements with diagnostic info', async () => {
    const args = { selector: 'div.hidden' };

    const mockElements = [
      createMockElement({
        tag: 'div',
        selector: 'class="hidden.banner"',
        classes: 'hidden.banner',
        text: 'Hidden content',
        position: { x: 0, y: 0, width: 0, height: 0 },
        isVisible: false,
        isInteractive: false,
        opacity: 1,
        display: 'none',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 1 element matching "div.hidden"');
    expect(result.content[0].text).toContain('✗ hidden');
    expect(result.content[0].text).toContain('display: none');
  });

  test('should handle element with zero opacity', async () => {
    const args = { selector: '#faded' };

    const mockElements = [
      createMockElement({
        tag: 'div',
        selector: '#faded',
        classes: 'faded',
        text: 'Invisible',
        position: { x: 100, y: 100, width: 200, height: 50 },
        isVisible: false,
        isInteractive: false,
        opacity: 0,
        display: 'block',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('✗ hidden');
    expect(result.content[0].text).toContain('opacity: 0');
  });

  test('should handle element with zero size', async () => {
    const args = { selector: '.collapsed' };

    const mockElements = [
      createMockElement({
        tag: 'div',
        selector: 'class="collapsed"',
        classes: 'collapsed',
        text: '',
        position: { x: 50, y: 50, width: 0, height: 100 },
        isVisible: false,
        isInteractive: false,
        opacity: 1,
        display: 'block',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('✗ hidden');
    expect(result.content[0].text).toContain('zero size');
  });

  test('should normalize test ID selectors', async () => {
    const args = { selector: 'testid:login-button' };

    const mockElements = [
      createMockElement({
        tag: 'button',
        selector: 'data-testid="login-button"',
        testId: 'login-button',
        classes: 'btn',
        text: 'Login',
        position: { x: 100, y: 200, width: 80, height: 40 },
        isVisible: true,
        isInteractive: true,
        opacity: 1,
        display: 'block',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(mockPageLocator).toHaveBeenCalledWith('[data-testid="login-button"]');
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 1 element matching "testid:login-button"');
  });

  test('should handle no matches found', async () => {
    const args = { selector: '.non-existent' };

    mockPageLocator.mockReturnValue(createMockLocator([]));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('No elements found matching ".non-existent"');
    expect(result.content[0].text).toContain('Tip: Try using inspect_dom to explore the page structure');
  });

  test('should limit results to default 10 elements', async () => {
    const args = { selector: 'li' };

    const mockElements = Array.from({ length: 15 }, (_, i) =>
      createMockElement({
        tag: 'li',
        selector: `#item-${i}`,
        classes: 'list-item',
        text: `Item ${i + 1}`,
        position: { x: 10, y: 10 + i * 30, width: 200, height: 25 },
        isVisible: true,
        isInteractive: false,
        opacity: 1,
        display: 'list-item',
      })
    );

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 15 elements matching "li"');
    expect(result.content[0].text).toContain('Showing 10 of 15 matches (5 omitted)');
    expect(result.content[0].text).toContain('Use limit parameter to show more');
    expect(result.content[0].text).toContain('[0]');
    expect(result.content[0].text).toContain('[9]');
    expect(result.content[0].text).not.toContain('[10]');
  });

  test('should respect custom limit parameter', async () => {
    const args = { selector: 'div', limit: 3 };

    const mockElements = Array.from({ length: 10 }, (_, i) =>
      createMockElement({
        tag: 'div',
        selector: `#div-${i}`,
        classes: 'container',
        text: `Div ${i + 1}`,
        position: { x: 0, y: i * 50, width: 400, height: 40 },
        isVisible: true,
        isInteractive: false,
        opacity: 1,
        display: 'block',
      })
    );

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 10 elements matching "div"');
    expect(result.content[0].text).toContain('Showing 3 of 10 matches (7 omitted)');
    expect(result.content[0].text).toContain('[0]');
    expect(result.content[0].text).toContain('[2]');
    expect(result.content[0].text).not.toContain('[3]');
  });

  test('should truncate long text content', async () => {
    const args = { selector: 'p' };

    const longText = 'A'.repeat(100);

    const mockElements = [
      createMockElement({
        tag: 'p',
        selector: 'class="paragraph"',
        classes: 'paragraph',
        text: longText,
        position: { x: 0, y: 0, width: 600, height: 100 },
        isVisible: true,
        isInteractive: false,
        opacity: 1,
        display: 'block',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    // Text is truncated to 100 chars in evaluate, then to 50 in display
    expect(result.content[0].text).toContain('"AAA');
    expect(result.content[0].text).toContain('..."');
  });

  test('should handle elements without test IDs', async () => {
    const args = { selector: 'span.label' };

    const mockElements = [
      createMockElement({
        tag: 'span',
        selector: 'class="label.text"',
        classes: 'label.text',
        text: 'Name:',
        position: { x: 20, y: 50, width: 100, height: 20 },
        isVisible: true,
        isInteractive: false,
        opacity: 1,
        display: 'inline',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('<span class="label.text">');
    expect(result.content[0].text).toContain('"Name:"');
  });

  test('should handle interactive links', async () => {
    const args = { selector: 'a' };

    const mockElements = [
      createMockElement({
        tag: 'a',
        selector: '#home-link',
        classes: 'nav-link',
        text: 'Home',
        position: { x: 100, y: 10, width: 80, height: 30 },
        isVisible: true,
        isInteractive: true,
        opacity: 1,
        display: 'inline-block',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('✓ visible');
    expect(result.content[0].text).toContain('⚡ interactive');
  });

  test('should skip elements that fail evaluation', async () => {
    const args = { selector: 'button' };

    const mockEvaluateFail = jest.fn() as jest.MockedFunction<(fn: any) => Promise<any>>;
    mockEvaluateFail.mockRejectedValue(new Error('Element detached from DOM'));

    const mockElements = [
      createMockElement({
        tag: 'button',
        selector: 'data-testid="ok"',
        testId: 'ok',
        classes: 'btn',
        text: 'OK',
        position: { x: 100, y: 100, width: 80, height: 40 },
        isVisible: true,
        isInteractive: true,
        opacity: 1,
        display: 'block',
      }),
      {
        evaluate: mockEvaluateFail,
      },
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    // Should only show the successful element
    expect(result.content[0].text).toContain('Found 2 elements matching "button"');
    expect(result.content[0].text).toContain('[0] <button data-testid="ok">');
    expect(result.content[0].text).not.toContain('[1]');
  });

  test('should handle browser disconnection gracefully', async () => {
    mockIsConnected.mockReturnValue(false);

    const result = await querySelectorAllTool.execute({ selector: 'div' }, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser is disconnected');
  });

  test('should handle page closed error gracefully', async () => {
    mockIsClosed.mockReturnValue(true);

    const result = await querySelectorAllTool.execute({ selector: 'div' }, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Page is closed');
  });

  test('should handle locator errors gracefully', async () => {
    mockPageLocator.mockImplementation(() => {
      throw new Error('Invalid selector');
    });

    const result = await querySelectorAllTool.execute({ selector: ':::invalid' }, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to query selector: Invalid selector');
  });

  test('should show all matches when total equals limit', async () => {
    const args = { selector: 'input', limit: 5 };

    const mockElements = Array.from({ length: 5 }, (_, i) =>
      createMockElement({
        tag: 'input',
        selector: `data-testid="field-${i}"`,
        testId: `field-${i}`,
        classes: 'form-control',
        text: '',
        position: { x: 10, y: 50 + i * 40, width: 300, height: 30 },
        isVisible: true,
        isInteractive: true,
        opacity: 1,
        display: 'block',
      })
    );

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 5 elements matching "input"');
    expect(result.content[0].text).toContain('Showing all 5 matches');
    expect(result.content[0].text).not.toContain('omitted');
  });

  test('should filter to show only visible elements when onlyVisible is true', async () => {
    const args = { selector: 'button', onlyVisible: true };

    const mockElements = [
      createMockElement({
        tag: 'button',
        selector: 'data-testid="visible-btn"',
        testId: 'visible-btn',
        classes: 'btn',
        text: 'Click Me',
        position: { x: 100, y: 100, width: 80, height: 40 },
        isVisible: true,
        isInteractive: true,
        opacity: 1,
        display: 'block',
      }),
      createMockElement({
        tag: 'button',
        selector: 'data-testid="hidden-btn"',
        testId: 'hidden-btn',
        classes: 'btn',
        text: 'Hidden',
        position: { x: 0, y: 0, width: 0, height: 0 },
        isVisible: false,
        isInteractive: true,
        opacity: 0,
        display: 'none',
      }),
      createMockElement({
        tag: 'button',
        selector: 'data-testid="another-visible"',
        testId: 'another-visible',
        classes: 'btn',
        text: 'Another',
        position: { x: 200, y: 100, width: 80, height: 40 },
        isVisible: true,
        isInteractive: true,
        opacity: 1,
        display: 'block',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 3 elements matching "button" (2 visible)');
    expect(result.content[0].text).toContain('[0] <button data-testid="visible-btn">');
    expect(result.content[0].text).toContain('[1] <button data-testid="another-visible">');
    expect(result.content[0].text).not.toContain('hidden-btn');
    expect(result.content[0].text).toContain('Showing 2 visible matches');
  });

  test('should filter to show only hidden elements when onlyVisible is false', async () => {
    const args = { selector: 'div', onlyVisible: false };

    const mockElements = [
      createMockElement({
        tag: 'div',
        selector: 'class="visible"',
        classes: 'visible',
        text: 'Visible',
        position: { x: 100, y: 100, width: 200, height: 50 },
        isVisible: true,
        isInteractive: false,
        opacity: 1,
        display: 'block',
      }),
      createMockElement({
        tag: 'div',
        selector: 'class="hidden"',
        classes: 'hidden',
        text: 'Hidden',
        position: { x: 0, y: 0, width: 0, height: 0 },
        isVisible: false,
        isInteractive: false,
        opacity: 0,
        display: 'none',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 2 elements matching "div" (1 hidden)');
    expect(result.content[0].text).toContain('[0] <div class="hidden">');
    expect(result.content[0].text).not.toContain('class="visible"');
    expect(result.content[0].text).toContain('Showing 1 hidden match');
  });

  test('should show all elements when onlyVisible is undefined', async () => {
    const args = { selector: 'span' };

    const mockElements = [
      createMockElement({
        tag: 'span',
        selector: 'class="visible"',
        classes: 'visible',
        text: 'Visible',
        position: { x: 100, y: 100, width: 50, height: 20 },
        isVisible: true,
        isInteractive: false,
        opacity: 1,
        display: 'inline',
      }),
      createMockElement({
        tag: 'span',
        selector: 'class="hidden"',
        classes: 'hidden',
        text: 'Hidden',
        position: { x: 0, y: 0, width: 0, height: 0 },
        isVisible: false,
        isInteractive: false,
        opacity: 0,
        display: 'none',
      }),
    ];

    mockPageLocator.mockReturnValue(createMockLocator(mockElements));

    const result = await querySelectorAllTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Found 2 elements matching "span"');
    expect(result.content[0].text).toContain('class="visible"');
    expect(result.content[0].text).toContain('class="hidden"');
    expect(result.content[0].text).toContain('Showing all 2 matches');
  });
});
