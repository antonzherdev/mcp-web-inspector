import { CheckVisibilityTool } from '../check_visibility.js';
import { ToolContext } from '../../../common/types.js';
import { Page, Browser, Locator } from 'playwright';
import { jest } from '@jest/globals';

// Mock Locator
const mockLocatorCount = jest.fn() as jest.MockedFunction<() => Promise<number>>;
const mockLocatorIsVisible = jest.fn() as jest.MockedFunction<() => Promise<boolean>>;
const mockLocatorEvaluate = jest.fn() as jest.MockedFunction<(pageFunction: any) => Promise<any>>;
const mockLocatorFirst = jest.fn() as jest.MockedFunction<() => Locator>;
const mockLocatorNth = jest.fn() as jest.MockedFunction<(index: number) => Locator>;

const mockLocator = {
  count: mockLocatorCount,
  isVisible: mockLocatorIsVisible,
  evaluate: mockLocatorEvaluate,
  first: mockLocatorFirst,
  nth: mockLocatorNth,
} as unknown as Locator;

// Mock first() to return a locator with the same methods
mockLocatorFirst.mockReturnValue(mockLocator);
mockLocatorNth.mockReturnValue(mockLocator);

// Mock Page
const mockPageLocator = jest.fn().mockReturnValue(mockLocator);
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

describe('CheckVisibilityTool', () => {
  let visibilityTool: CheckVisibilityTool;

  beforeEach(() => {
    jest.clearAllMocks();
    visibilityTool = new CheckVisibilityTool(mockServer);
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
  });

  test('should check visibility of an element successfully', async () => {
    const args = { selector: '#test-button' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 1.0,
        isInViewport: true,
        opacity: 1,
        display: 'block',
        visibility: 'visible',
        isClipped: false,
        isCovered: false,
        coveringElementInfo: '',
        coveragePercent: 0,
        pointerEvents: 'auto',
        isDisabled: false,
        isReadonly: false,
        ariaDisabled: false,
      })
      .mockResolvedValueOnce('<button#test-button>');

    const result = await visibilityTool.execute(args, mockContext);

    expect(mockPageLocator).toHaveBeenCalledWith('#test-button');
    expect(mockLocatorCount).toHaveBeenCalled();
    expect(mockLocatorIsVisible).toHaveBeenCalled();
    expect(mockLocatorEvaluate).toHaveBeenCalled();
    expect(result.isError).toBe(false);

    const response = result.content[0].text as string;
    expect(response).toContain('Visibility: <button#test-button>');
    expect(response).toContain('✓ visible');
    expect(response).toContain('✓ in viewport');
    expect(response).toContain('opacity: 1');
    expect(response).toContain('display: block');
    expect(response).toContain('visibility: visible');
    expect(response).not.toContain('Issues:');
  });

  test('should detect element that needs scrolling', async () => {
    const args = { selector: '#bottom-button' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 0.0,
        isInViewport: false,
        opacity: 1,
        display: 'block',
        visibility: 'visible',
        isClipped: false,
        isCovered: false,
        coveringElementInfo: '',
        coveragePercent: 0,
        pointerEvents: 'auto',
        isDisabled: false,
        isReadonly: false,
        ariaDisabled: false,
      })
      .mockResolvedValueOnce('<button#bottom-button>');

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('✓ visible');
    expect(response).toContain('✗ not in viewport');
    expect(response).toContain('Issues:');
    expect(response).toContain('⚠ needs scroll to bring into view');
    expect(response).toContain('→ Call scroll_to_element before clicking');
  });

  test('should detect clipped element', async () => {
    const args = { selector: '#clipped-element' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 0.0,
        isInViewport: false,
        opacity: 1,
        display: 'block',
        visibility: 'visible',
        isClipped: true,
        isCovered: false,
        coveringElementInfo: '',
        coveragePercent: 0,
        pointerEvents: 'auto',
        isDisabled: false,
        isReadonly: false,
        ariaDisabled: false,
      })
      .mockResolvedValueOnce('<div#clipped-element>');

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Issues:');
    expect(response).toContain('✗ clipped by parent overflow:hidden');
  });

  test('should detect covered element', async () => {
    const args = { selector: '#covered-button' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 1.0,
        isInViewport: true,
        opacity: 1,
        display: 'block',
        visibility: 'visible',
        isClipped: false,
        isCovered: true,
        coveringElementInfo: '<div.modal-overlay> (z-index: 1000)',
        coveragePercent: 80,
        pointerEvents: 'auto',
        isDisabled: false,
        isReadonly: false,
        ariaDisabled: false,
      })
      .mockResolvedValueOnce('<button#covered-button>');

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Issues:');
    expect(response).toContain('✗ covered by another element');
    expect(response).toContain('~80% covered');
    expect(response).toContain('Covering: <div.modal-overlay> (z-index: 1000)');
    expect(response).toContain('→ Element may be behind modal, overlay, or fixed header');
  });

  test('should handle testid selector shorthand', async () => {
    const args = { selector: 'testid:submit-button' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 1.0,
        isInViewport: true,
        opacity: 1,
        display: 'block',
        visibility: 'visible',
        isClipped: false,
        isCovered: false,
        coveringElementInfo: '',
        coveragePercent: 0,
        pointerEvents: 'auto',
        isDisabled: false,
        isReadonly: false,
        ariaDisabled: false,
      })
      .mockResolvedValueOnce('<button data-testid="submit-button">');

    const result = await visibilityTool.execute(args, mockContext);

    expect(mockPageLocator).toHaveBeenCalledWith('[data-testid="submit-button"]');
    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Visibility: <button data-testid="submit-button">');
  });

  test('should return error when element not found', async () => {
    const args = { selector: '#non-existent' };

    mockLocatorCount.mockResolvedValue(0);

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to check visibility: No elements found');
  });

  test('should handle missing page', async () => {
    const args = { selector: '#test' };
    const contextWithoutPage = {
      browser: mockBrowser,
      server: mockServer,
    } as unknown as ToolContext;

    const result = await visibilityTool.execute(args, contextWithoutPage);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser page not initialized');
  });

  test('should detect element partially visible in viewport', async () => {
    const args = { selector: '#partial-element' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 0.3,
        isInViewport: true,
        opacity: 1,
        display: 'block',
        visibility: 'visible',
        isClipped: false,
        isCovered: false,
        coveringElementInfo: '',
        coveragePercent: 0,
        pointerEvents: 'auto',
        isDisabled: false,
        isReadonly: false,
        ariaDisabled: false,
      })
      .mockResolvedValueOnce('<div#partial-element>');

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('✓ visible');
    expect(response).toContain('✓ in viewport (30% visible)');
    expect(response).not.toContain('Issues:');
  });

  test('should handle element with low opacity', async () => {
    const args = { selector: '#faded-element' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 1.0,
        isInViewport: true,
        opacity: 0.5,
        display: 'block',
        visibility: 'visible',
        isClipped: false,
        isCovered: false,
        coveringElementInfo: '',
        coveragePercent: 0,
        pointerEvents: 'auto',
        isDisabled: false,
        isReadonly: false,
        ariaDisabled: false,
      })
      .mockResolvedValueOnce('<div#faded-element>');

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('opacity: 0.5');
  });

  test('should handle disconnected browser', async () => {
    const args = { selector: '#test' };
    mockIsConnected.mockReturnValue(false);

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('disconnected');
  });

  test('should handle closed page', async () => {
    const args = { selector: '#test' };
    mockIsClosed.mockReturnValue(true);

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('closed');
  });

  test('should handle evaluation error', async () => {
    const args = { selector: '#test' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate.mockRejectedValue(new Error('Evaluation failed'));

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to check visibility');
  });

  test('should handle multiple matching elements with warning', async () => {
    const args = { selector: 'button.submit' };

    // Simulate 3 matching elements
    mockLocatorCount.mockResolvedValue(3);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 1.0,
        isInViewport: true,
        opacity: 1,
        display: 'block',
        visibility: 'visible',
        isClipped: false,
        isCovered: false,
        coveringElementInfo: '',
        coveragePercent: 0,
        pointerEvents: 'auto',
        isDisabled: false,
        isReadonly: false,
        ariaDisabled: false,
      })
      .mockResolvedValueOnce('<button class="submit">');

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;

    // Should show warning about multiple matches
    expect(response).toContain('⚠ Found 3 elements matching "button.submit"');
    expect(response).toContain('using element 1 (first visible)');

    // Should still show visibility info for first element
    expect(response).toContain('Visibility: <button class="submit">');
    expect(response).toContain('✓ visible');
  });

  test('should detect disabled element', async () => {
    const args = { selector: '#disabled-button' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 1.0,
        isInViewport: true,
        opacity: 1,
        display: 'block',
        visibility: 'visible',
        isClipped: false,
        isCovered: false,
        coveringElementInfo: '',
        coveragePercent: 0,
        pointerEvents: 'auto',
        isDisabled: true,
        isReadonly: false,
        ariaDisabled: false,
      })
      .mockResolvedValueOnce('<button#disabled-button>');

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('⚠ interactability: disabled');
    expect(response).toContain('→ Element cannot be interacted with in current state');
  });

  test('should detect pointer-events none element', async () => {
    const args = { selector: '#no-pointer' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 1.0,
        isInViewport: true,
        opacity: 1,
        display: 'block',
        visibility: 'visible',
        isClipped: false,
        isCovered: false,
        coveringElementInfo: '',
        coveragePercent: 0,
        pointerEvents: 'none',
        isDisabled: false,
        isReadonly: false,
        ariaDisabled: false,
      })
      .mockResolvedValueOnce('<div#no-pointer>');

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('⚠ interactability: pointer-events: none');
    expect(response).toContain('→ Element cannot be interacted with in current state');
  });

  test('should detect multiple interactability issues', async () => {
    const args = { selector: '#complex-disabled' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate
      .mockResolvedValueOnce({
        viewportRatio: 1.0,
        isInViewport: true,
        opacity: 1,
        display: 'block',
        visibility: 'visible',
        isClipped: false,
        isCovered: false,
        coveringElementInfo: '',
        coveragePercent: 0,
        pointerEvents: 'auto',
        isDisabled: true,
        isReadonly: true,
        ariaDisabled: true,
      })
      .mockResolvedValueOnce('<input#complex-disabled>');

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('⚠ interactability: disabled, readonly, aria-disabled');
  });
});
