import { ElementVisibilityTool } from '../../../tools/browser/elementVisibility.js';
import { ToolContext } from '../../../tools/common/types.js';
import { Page, Browser, Locator } from 'playwright';
import { jest } from '@jest/globals';

// Mock Locator
const mockLocatorCount = jest.fn() as jest.MockedFunction<() => Promise<number>>;
const mockLocatorIsVisible = jest.fn() as jest.MockedFunction<() => Promise<boolean>>;
const mockLocatorEvaluate = jest.fn() as jest.MockedFunction<(pageFunction: any) => Promise<any>>;

const mockLocator = {
  count: mockLocatorCount,
  isVisible: mockLocatorIsVisible,
  evaluate: mockLocatorEvaluate,
} as unknown as Locator;

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

describe('ElementVisibilityTool', () => {
  let visibilityTool: ElementVisibilityTool;

  beforeEach(() => {
    jest.clearAllMocks();
    visibilityTool = new ElementVisibilityTool(mockServer);
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
  });

  test('should check visibility of an element successfully', async () => {
    const args = { selector: '#test-button' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate.mockResolvedValue({
      viewportRatio: 1.0,
      isInViewport: true,
      opacity: 1,
      display: 'block',
      visibility: 'visible',
      isClipped: false,
      isCovered: false,
    });

    const result = await visibilityTool.execute(args, mockContext);

    expect(mockPageLocator).toHaveBeenCalledWith('#test-button');
    expect(mockLocatorCount).toHaveBeenCalled();
    expect(mockLocatorIsVisible).toHaveBeenCalled();
    expect(mockLocatorEvaluate).toHaveBeenCalled();
    expect(result.isError).toBe(false);

    const response = JSON.parse(result.content[0].text as string);
    expect(response.isVisible).toBe(true);
    expect(response.isInViewport).toBe(true);
    expect(response.viewportRatio).toBe(1.0);
    expect(response.needsScroll).toBe(false);
  });

  test('should detect element that needs scrolling', async () => {
    const args = { selector: '#bottom-button' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate.mockResolvedValue({
      viewportRatio: 0.0,
      isInViewport: false,
      opacity: 1,
      display: 'block',
      visibility: 'visible',
      isClipped: false,
      isCovered: false,
    });

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text as string);
    expect(response.isVisible).toBe(true);
    expect(response.isInViewport).toBe(false);
    expect(response.needsScroll).toBe(true);
  });

  test('should detect clipped element', async () => {
    const args = { selector: '#clipped-element' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate.mockResolvedValue({
      viewportRatio: 0.0,
      isInViewport: false,
      opacity: 1,
      display: 'block',
      visibility: 'visible',
      isClipped: true,
      isCovered: false,
    });

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text as string);
    expect(response.isClipped).toBe(true);
  });

  test('should detect covered element', async () => {
    const args = { selector: '#covered-button' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate.mockResolvedValue({
      viewportRatio: 1.0,
      isInViewport: true,
      opacity: 1,
      display: 'block',
      visibility: 'visible',
      isClipped: false,
      isCovered: true,
    });

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text as string);
    expect(response.isCovered).toBe(true);
  });

  test('should handle testid selector shorthand', async () => {
    const args = { selector: 'testid:submit-button' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate.mockResolvedValue({
      viewportRatio: 1.0,
      isInViewport: true,
      opacity: 1,
      display: 'block',
      visibility: 'visible',
      isClipped: false,
      isCovered: false,
    });

    const result = await visibilityTool.execute(args, mockContext);

    expect(mockPageLocator).toHaveBeenCalledWith('[data-testid="submit-button"]');
    expect(result.isError).toBe(false);
  });

  test('should return error when element not found', async () => {
    const args = { selector: '#non-existent' };

    mockLocatorCount.mockResolvedValue(0);

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Element not found');
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
    mockLocatorEvaluate.mockResolvedValue({
      viewportRatio: 0.3,
      isInViewport: true,
      opacity: 1,
      display: 'block',
      visibility: 'visible',
      isClipped: false,
      isCovered: false,
    });

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text as string);
    expect(response.viewportRatio).toBe(0.3);
    expect(response.isInViewport).toBe(true);
    expect(response.needsScroll).toBe(false);
  });

  test('should handle element with low opacity', async () => {
    const args = { selector: '#faded-element' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorEvaluate.mockResolvedValue({
      viewportRatio: 1.0,
      isInViewport: true,
      opacity: 0.5,
      display: 'block',
      visibility: 'visible',
      isClipped: false,
      isCovered: false,
    });

    const result = await visibilityTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text as string);
    expect(response.opacity).toBe(0.5);
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
});
