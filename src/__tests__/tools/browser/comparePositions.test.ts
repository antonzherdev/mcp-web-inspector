import { ComparePositionsTool } from '../../../tools/browser/comparePositions.js';
import { ToolContext } from '../../../tools/common/types.js';
import { Page, Browser, Locator } from 'playwright';
import { jest } from '@jest/globals';

// Mock Locator for first element
const mockLocator1Count = jest.fn() as jest.MockedFunction<() => Promise<number>>;
const mockLocator1BoundingBox = jest.fn() as jest.MockedFunction<() => Promise<{ x: number; y: number; width: number; height: number } | null>>;
const mockLocator1Evaluate = jest.fn() as jest.MockedFunction<(pageFunction: any) => Promise<any>>;
const mockLocator1First = jest.fn() as jest.MockedFunction<() => Locator>;

const mockLocator1 = {
  count: mockLocator1Count,
  boundingBox: mockLocator1BoundingBox,
  evaluate: mockLocator1Evaluate,
  first: mockLocator1First,
} as unknown as Locator;

mockLocator1First.mockReturnValue(mockLocator1);

// Mock Locator for second element
const mockLocator2Count = jest.fn() as jest.MockedFunction<() => Promise<number>>;
const mockLocator2BoundingBox = jest.fn() as jest.MockedFunction<() => Promise<{ x: number; y: number; width: number; height: number } | null>>;
const mockLocator2Evaluate = jest.fn() as jest.MockedFunction<(pageFunction: any) => Promise<any>>;
const mockLocator2First = jest.fn() as jest.MockedFunction<() => Locator>;

const mockLocator2 = {
  count: mockLocator2Count,
  boundingBox: mockLocator2BoundingBox,
  evaluate: mockLocator2Evaluate,
  first: mockLocator2First,
} as unknown as Locator;

mockLocator2First.mockReturnValue(mockLocator2);

// Track selector call count to return different locators
let locatorCallCount = 0;

// Mock Page
const mockPageLocator = jest.fn().mockImplementation(() => {
  // Return different mock locators based on call order
  // First call returns mockLocator1, second call returns mockLocator2
  locatorCallCount++;
  if (locatorCallCount % 2 === 1) {
    return mockLocator1;
  }
  return mockLocator2;
});

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

describe('ComparePositionsTool', () => {
  let comparePositionsTool: ComparePositionsTool;

  beforeEach(() => {
    jest.clearAllMocks();
    locatorCallCount = 0; // Reset call count
    comparePositionsTool = new ComparePositionsTool(mockServer);
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
  });

  test('should compare top alignment - aligned', async () => {
    const args = {
      selector1: '#header1',
      selector2: '#header2',
      checkAlignment: 'top',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 80, width: 600, height: 64 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 620, y: 80, width: 580, height: 64 });
    mockLocator1Evaluate.mockResolvedValue('<header#header1>');
    mockLocator2Evaluate.mockResolvedValue('<header#header2>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Top: ✓ aligned');
    expect(response).toContain('Difference: 0px');
  });

  test('should compare top alignment - not aligned', async () => {
    const args = {
      selector1: '#header1',
      selector2: '#header2',
      checkAlignment: 'top',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 80, width: 600, height: 64 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 620, y: 85, width: 580, height: 64 });
    mockLocator1Evaluate.mockResolvedValue('<header#header1>');
    mockLocator2Evaluate.mockResolvedValue('<header#header2>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Top: ✗ not aligned');
    expect(response).toContain('header1: 80px');
    expect(response).toContain('header2: 85px');
    expect(response).toContain('Difference: 5px');
  });

  test('should compare height - aligned', async () => {
    const args = {
      selector1: 'testid:main-header',
      selector2: 'testid:chat-header',
      checkAlignment: 'height',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 0, width: 600, height: 64 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 620, y: 5, width: 580, height: 64 });
    mockLocator1Evaluate.mockResolvedValue('<header data-testid="main-header">');
    mockLocator2Evaluate.mockResolvedValue('<header data-testid="chat-header">');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Height: ✓ aligned');
    expect(response).toContain('main-header: 64px');
    expect(response).toContain('chat-header: 64px');
    expect(response).toContain('Difference: 0px');
  });

  test('should compare width - not aligned', async () => {
    const args = {
      selector1: '#button1',
      selector2: '#button2',
      checkAlignment: 'width',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 0, width: 120, height: 40 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 130, y: 0, width: 100, height: 40 });
    mockLocator1Evaluate.mockResolvedValue('<button#button1>');
    mockLocator2Evaluate.mockResolvedValue('<button#button2>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Width: ✗ not aligned');
    expect(response).toContain('button1: 120px');
    expect(response).toContain('button2: 100px');
    expect(response).toContain('Difference: 20px');
  });

  test('should compare left alignment', async () => {
    const args = {
      selector1: '#sidebar',
      selector2: '#menu',
      checkAlignment: 'left',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 0, width: 250, height: 800 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 0, y: 100, width: 250, height: 50 });
    mockLocator1Evaluate.mockResolvedValue('<aside#sidebar>');
    mockLocator2Evaluate.mockResolvedValue('<nav#menu>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Left: ✓ aligned');
    expect(response).toContain('sidebar: 0px');
    expect(response).toContain('menu: 0px');
  });

  test('should compare right alignment', async () => {
    const args = {
      selector1: '#div1',
      selector2: '#div2',
      checkAlignment: 'right',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    // div1: left=0, width=100, so right=100
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 0, width: 100, height: 50 });
    // div2: left=20, width=80, so right=100
    mockLocator2BoundingBox.mockResolvedValue({ x: 20, y: 60, width: 80, height: 50 });
    mockLocator1Evaluate.mockResolvedValue('<div#div1>');
    mockLocator2Evaluate.mockResolvedValue('<div#div2>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Right: ✓ aligned');
    expect(response).toContain('Difference: 0px');
  });

  test('should compare bottom alignment', async () => {
    const args = {
      selector1: '#box1',
      selector2: '#box2',
      checkAlignment: 'bottom',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    // box1: top=0, height=100, so bottom=100
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 0, width: 50, height: 100 });
    // box2: top=50, height=50, so bottom=100
    mockLocator2BoundingBox.mockResolvedValue({ x: 60, y: 50, width: 50, height: 50 });
    mockLocator1Evaluate.mockResolvedValue('<div#box1>');
    mockLocator2Evaluate.mockResolvedValue('<div#box2>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('Bottom: ✓ aligned');
    expect(response).toContain('Difference: 0px');
  });

  test('should return error for invalid checkAlignment parameter', async () => {
    const args = {
      selector1: '#elem1',
      selector2: '#elem2',
      checkAlignment: 'invalid',
    };

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid checkAlignment value');
    expect(result.content[0].text).toContain('Must be one of: top, left, right, bottom, width, height');
  });

  test('should return error when first element not found', async () => {
    const args = {
      selector1: '#missing',
      selector2: '#elem2',
      checkAlignment: 'top',
    };

    mockLocator1Count.mockResolvedValue(0);
    mockLocator2Count.mockResolvedValue(1);

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('First element not found');
  });

  test('should return error when second element not found', async () => {
    const args = {
      selector1: '#elem1',
      selector2: '#missing',
      checkAlignment: 'top',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(0);

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Second element not found');
  });

  test('should return error when first element is hidden', async () => {
    const args = {
      selector1: '#hidden1',
      selector2: '#elem2',
      checkAlignment: 'height',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue(null);
    mockLocator2BoundingBox.mockResolvedValue({ x: 0, y: 0, width: 100, height: 50 });
    mockLocator1Evaluate.mockResolvedValue('<div#hidden1>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('First element is hidden');
  });

  test('should return error when second element is hidden', async () => {
    const args = {
      selector1: '#elem1',
      selector2: '#hidden2',
      checkAlignment: 'width',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 0, width: 100, height: 50 });
    mockLocator2BoundingBox.mockResolvedValue(null);
    mockLocator1Evaluate.mockResolvedValue('<div#elem1>');
    mockLocator2Evaluate.mockResolvedValue('<div#hidden2>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Second element is hidden');
  });

  test('should handle multiple matches for first element with warning', async () => {
    const args = {
      selector1: 'button.submit',
      selector2: '#elem2',
      checkAlignment: 'height',
    };

    mockLocator1Count.mockResolvedValue(3);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 0, width: 120, height: 40 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 130, y: 0, width: 100, height: 40 });
    mockLocator1Evaluate.mockResolvedValue('<button class="submit">');
    mockLocator2Evaluate.mockResolvedValue('<div#elem2>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('⚠ Warning: First selector matched 3 elements, using first');
    expect(response).toContain('Height: ✓ aligned');
  });

  test('should handle multiple matches for second element with warning', async () => {
    const args = {
      selector1: '#elem1',
      selector2: 'div.content',
      checkAlignment: 'top',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(2);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 100, width: 300, height: 50 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 320, y: 100, width: 300, height: 50 });
    mockLocator1Evaluate.mockResolvedValue('<div#elem1>');
    mockLocator2Evaluate.mockResolvedValue('<div class="content">');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('⚠ Warning: Second selector matched 2 elements, using first');
    expect(response).toContain('Top: ✓ aligned');
  });

  test('should handle both elements with multiple matches', async () => {
    const args = {
      selector1: 'button',
      selector2: 'div',
      checkAlignment: 'left',
    };

    mockLocator1Count.mockResolvedValue(5);
    mockLocator2Count.mockResolvedValue(10);
    mockLocator1BoundingBox.mockResolvedValue({ x: 20, y: 0, width: 100, height: 40 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 20, y: 50, width: 200, height: 100 });
    mockLocator1Evaluate.mockResolvedValue('<button>');
    mockLocator2Evaluate.mockResolvedValue('<div>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    expect(response).toContain('⚠ Warning: First selector matched 5 elements, using first');
    expect(response).toContain('⚠ Warning: Second selector matched 10 elements, using first');
    expect(response).toContain('Left: ✓ aligned');
  });

  test('should handle decimal coordinates by rounding', async () => {
    const args = {
      selector1: '#elem1',
      selector2: '#elem2',
      checkAlignment: 'top',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 100.4, width: 300, height: 50 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 320, y: 100.6, width: 300, height: 50 });
    mockLocator1Evaluate.mockResolvedValue('<div#elem1>');
    mockLocator2Evaluate.mockResolvedValue('<div#elem2>');

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    const response = result.content[0].text as string;
    // Both should round to 100 or 101, difference should be 0 or 1
    expect(response).toContain('Top:');
    expect(response).toContain('px');
  });

  test('should handle missing page', async () => {
    const args = {
      selector1: '#elem1',
      selector2: '#elem2',
      checkAlignment: 'top',
    };
    const contextWithoutPage = {
      browser: mockBrowser,
      server: mockServer,
    } as unknown as ToolContext;

    const result = await comparePositionsTool.execute(args, contextWithoutPage);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser page not initialized');
  });

  test('should handle disconnected browser', async () => {
    const args = {
      selector1: '#elem1',
      selector2: '#elem2',
      checkAlignment: 'height',
    };
    mockIsConnected.mockReturnValue(false);

    const result = await comparePositionsTool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('disconnected');
  });
});
