import { ElementVisibilityTool, ElementPositionTool } from '../../../tools/browser/elementInspection.js';
import { ToolContext } from '../../../tools/common/types.js';
import { Page, Browser, Locator } from 'playwright';
import { jest } from '@jest/globals';

// Mock Locator
const mockLocatorCount = jest.fn() as jest.MockedFunction<() => Promise<number>>;
const mockLocatorIsVisible = jest.fn() as jest.MockedFunction<() => Promise<boolean>>;
const mockLocatorEvaluate = jest.fn() as jest.MockedFunction<(pageFunction: any) => Promise<any>>;
const mockLocatorBoundingBox = jest.fn() as jest.MockedFunction<() => Promise<{ x: number; y: number; width: number; height: number } | null>>;

const mockLocator = {
  count: mockLocatorCount,
  isVisible: mockLocatorIsVisible,
  evaluate: mockLocatorEvaluate,
  boundingBox: mockLocatorBoundingBox,
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
});

describe('ElementPositionTool', () => {
  let positionTool: ElementPositionTool;

  beforeEach(() => {
    jest.clearAllMocks();
    positionTool = new ElementPositionTool(mockServer);
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
  });

  test('should get element position successfully', async () => {
    const args = { selector: '#test-element' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorBoundingBox.mockResolvedValue({
      x: 100,
      y: 200,
      width: 300,
      height: 50,
    });
    mockLocatorEvaluate.mockResolvedValue(true);

    const result = await positionTool.execute(args, mockContext);

    expect(mockPageLocator).toHaveBeenCalledWith('#test-element');
    expect(mockLocatorCount).toHaveBeenCalled();
    expect(mockLocatorBoundingBox).toHaveBeenCalled();
    expect(result.isError).toBe(false);

    const response = JSON.parse(result.content[0].text as string);
    expect(response.x).toBe(100);
    expect(response.y).toBe(200);
    expect(response.width).toBe(300);
    expect(response.height).toBe(50);
    expect(response.inViewport).toBe(true);
  });

  test('should handle testid selector shorthand', async () => {
    const args = { selector: 'data-test:login-form' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorBoundingBox.mockResolvedValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    mockLocatorEvaluate.mockResolvedValue(true);

    const result = await positionTool.execute(args, mockContext);

    expect(mockPageLocator).toHaveBeenCalledWith('[data-test="login-form"]');
    expect(result.isError).toBe(false);
  });

  test('should return error when element not found', async () => {
    const args = { selector: '#missing' };

    mockLocatorCount.mockResolvedValue(0);

    const result = await positionTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Element not found');
  });

  test('should return error when element has no bounding box', async () => {
    const args = { selector: '#hidden' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorBoundingBox.mockResolvedValue(null);

    const result = await positionTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('no bounding box');
  });

  test('should handle missing page', async () => {
    const args = { selector: '#test' };
    const contextWithoutPage = {
      browser: mockBrowser,
      server: mockServer,
    } as unknown as ToolContext;

    const result = await positionTool.execute(args, contextWithoutPage);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser page not initialized');
  });

  test('should round coordinates to integers', async () => {
    const args = { selector: '#decimal-coords' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorBoundingBox.mockResolvedValue({
      x: 123.456,
      y: 789.012,
      width: 345.678,
      height: 90.123,
    });
    mockLocatorEvaluate.mockResolvedValue(false);

    const result = await positionTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text as string);
    expect(response.x).toBe(123);
    expect(response.y).toBe(789);
    expect(response.width).toBe(346);
    expect(response.height).toBe(90);
  });
});
