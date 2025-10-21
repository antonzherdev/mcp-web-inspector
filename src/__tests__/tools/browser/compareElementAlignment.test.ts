import { CompareElementAlignmentTool } from '../../../tools/browser/compareElementAlignment.js';
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

describe('CompareElementAlignmentTool', () => {
  let tool: CompareElementAlignmentTool;

  beforeEach(() => {
    jest.clearAllMocks();
    locatorCallCount = 0; // Reset call count
    tool = new CompareElementAlignmentTool(mockServer);
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
  });

  test('should return comprehensive alignment for fully aligned elements', async () => {
    const args = {
      selector1: '#header1',
      selector2: '#header2',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 80, width: 600, height: 64 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 0, y: 80, width: 600, height: 64 }); // Perfectly aligned
    mockLocator1Evaluate.mockResolvedValue('<header#header1>');
    mockLocator2Evaluate.mockResolvedValue('<header#header2>');

    const result = await tool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Alignment:');
    expect(result.content[0].text).toContain('Edges:');
    expect(result.content[0].text).toContain('Top:    ✓ aligned (both @ 80px)');
    expect(result.content[0].text).toContain('Left:   ✓ aligned (both @ 0px)');
    expect(result.content[0].text).toContain('Right:  ✓ aligned (both @ 600px)');
    expect(result.content[0].text).toContain('Bottom: ✓ aligned (both @ 144px)');
    expect(result.content[0].text).toContain('Centers:');
    expect(result.content[0].text).toContain('Horizontal: ✓ aligned (both @ 300px)');
    expect(result.content[0].text).toContain('Vertical:   ✓ aligned (both @ 112px)');
    expect(result.content[0].text).toContain('Dimensions:');
    expect(result.content[0].text).toContain('Width:  ✓ same (600px)');
    expect(result.content[0].text).toContain('Height: ✓ same (64px)');
  });

  test('should show misalignment details', async () => {
    const args = {
      selector1: 'testid:panel1',
      selector2: 'testid:panel2',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 0, width: 1200, height: 56 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 20, y: 0, width: 1180, height: 56 }); // 20px offset, different width
    mockLocator1Evaluate.mockResolvedValue('<div data-testid="panel1">');
    mockLocator2Evaluate.mockResolvedValue('<div data-testid="panel2">');

    const result = await tool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Left:   ✗ not aligned (0px vs 20px, diff: 20px)');
    expect(result.content[0].text).toContain('Right:  ✓ aligned (both @ 1200px)'); // Both end at same spot
    expect(result.content[0].text).toContain('Width:  ✗ different (1200px vs 1180px, diff: 20px)');
    expect(result.content[0].text).toContain('Top:    ✓ aligned (both @ 0px)');
    expect(result.content[0].text).toContain('Height: ✓ same (56px)');
  });

  test('should show center misalignment', async () => {
    const args = {
      selector1: 'button.btn1',
      selector2: 'button.btn2',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(1);
    mockLocator1BoundingBox.mockResolvedValue({ x: 100, y: 50, width: 120, height: 40 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 100, y: 100, width: 120, height: 40 }); // Same horizontal, different vertical
    mockLocator1Evaluate.mockResolvedValue('<button.btn1>');
    mockLocator2Evaluate.mockResolvedValue('<button.btn2>');

    const result = await tool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Horizontal: ✓ aligned (both @ 160px)'); // 100 + 120/2 = 160
    expect(result.content[0].text).toContain('Vertical:   ✗ not aligned (70px vs 120px, diff: 50px)'); // 50+20 vs 100+20
  });

  test('should handle first element not found', async () => {
    const args = {
      selector1: '#missing',
      selector2: '#header',
    };

    mockLocator1Count.mockResolvedValue(0);

    const result = await tool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('First element not found: #missing');
  });

  test('should handle second element not found', async () => {
    const args = {
      selector1: '#header',
      selector2: '#missing',
    };

    mockLocator1Count.mockResolvedValue(1);
    mockLocator2Count.mockResolvedValue(0);

    const result = await tool.execute(args, mockContext);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Second element not found: #missing');
  });

  test('should handle multiple matches with warning', async () => {
    const args = {
      selector1: '.header',
      selector2: '.sidebar',
    };

    mockLocator1Count.mockResolvedValue(3);
    mockLocator2Count.mockResolvedValue(2);
    mockLocator1BoundingBox.mockResolvedValue({ x: 0, y: 0, width: 1200, height: 60 });
    mockLocator2BoundingBox.mockResolvedValue({ x: 0, y: 60, width: 200, height: 500 });
    mockLocator1Evaluate.mockResolvedValue('<div.header>');
    mockLocator2Evaluate.mockResolvedValue('<aside.sidebar>');

    const result = await tool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('⚠ Warning: First selector matched 3 elements, using first');
    expect(result.content[0].text).toContain('⚠ Warning: Second selector matched 2 elements, using first');
  });
});
