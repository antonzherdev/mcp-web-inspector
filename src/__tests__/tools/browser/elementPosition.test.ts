import { ElementPositionTool } from '../../../tools/browser/elementPosition.js';
import { ToolContext } from '../../../tools/common/types.js';
import { Page, Browser, Locator } from 'playwright';
import { jest } from '@jest/globals';

// Mock Locator
const mockLocatorCount = jest.fn() as jest.MockedFunction<() => Promise<number>>;
const mockLocatorBoundingBox = jest.fn() as jest.MockedFunction<() => Promise<{ x: number; y: number; width: number; height: number } | null>>;
const mockLocatorEvaluate = jest.fn() as jest.MockedFunction<(pageFunction: any) => Promise<any>>;

const mockLocator = {
  count: mockLocatorCount,
  boundingBox: mockLocatorBoundingBox,
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
    mockLocatorEvaluate.mockResolvedValue({
      inViewport: true,
      descriptor: '<div#test-element>'
    });

    const result = await positionTool.execute(args, mockContext);

    expect(mockPageLocator).toHaveBeenCalledWith('#test-element');
    expect(mockLocatorCount).toHaveBeenCalled();
    expect(mockLocatorBoundingBox).toHaveBeenCalled();
    expect(result.isError).toBe(false);

    const response = result.content[0].text as string;
    expect(response).toContain('Position: <div#test-element>');
    expect(response).toContain('@ (100,200) 300x50px');
    expect(response).toContain('✓ in viewport');
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
    mockLocatorEvaluate.mockResolvedValue({
      inViewport: true,
      descriptor: '<form data-testid="login-form">'
    });

    const result = await positionTool.execute(args, mockContext);

    expect(mockPageLocator).toHaveBeenCalledWith('[data-test="login-form"]');
    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Position: <form data-testid="login-form">');
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
    mockLocatorEvaluate.mockResolvedValue({
      inViewport: false,
      descriptor: '<div#decimal-coords>'
    });

    const result = await positionTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('@ (123,789) 346x90px');
  });

  test('should detect element outside viewport', async () => {
    const args = { selector: '#below-fold' };

    mockLocatorCount.mockResolvedValue(1);
    mockLocatorBoundingBox.mockResolvedValue({
      x: 0,
      y: 2000,
      width: 300,
      height: 100,
    });
    mockLocatorEvaluate.mockResolvedValue({
      inViewport: false,
      descriptor: '<div#below-fold>'
    });

    const result = await positionTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('@ (0,2000) 300x100px');
    expect(response).toContain('✗ outside viewport');
  });

  test('should handle disconnected browser', async () => {
    const args = { selector: '#test' };
    mockIsConnected.mockReturnValue(false);

    const result = await positionTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('disconnected');
  });

  test('should handle closed page', async () => {
    const args = { selector: '#test' };
    mockIsClosed.mockReturnValue(true);

    const result = await positionTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('closed');
  });
});
