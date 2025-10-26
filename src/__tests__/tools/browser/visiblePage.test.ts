import { VisibleTextTool, VisibleHtmlTool } from '../../../tools/browser/visiblePage.js';
import { ToolContext } from '../../../tools/common/types.js';
import { Page, Browser } from 'playwright';
import { jest } from '@jest/globals';

// Mock the Page object
const mockEvaluate = jest.fn() as jest.MockedFunction<(pageFunction: Function | string, arg?: any) => Promise<any>>;
const mockContent = jest.fn();
const mockIsClosed = jest.fn().mockReturnValue(false);
const mockLocator = jest.fn();

const mockPage = {
  evaluate: mockEvaluate,
  content: mockContent,
  isClosed: mockIsClosed,
  locator: mockLocator,
} as unknown as Page;

// Mock the browser
const mockIsConnected = jest.fn().mockReturnValue(true);
const mockBrowser = {
  isConnected: mockIsConnected
} as unknown as Browser;

// Mock the server
const mockServer = {
  sendMessage: jest.fn()
};

// Mock context
const mockContext = {
  page: mockPage,
  browser: mockBrowser,
  server: mockServer
} as ToolContext;

describe('VisibleTextTool', () => {
  let visibleTextTool: VisibleTextTool;

  beforeEach(() => {
    jest.clearAllMocks();
    visibleTextTool = new VisibleTextTool(mockServer);
    // Reset mocks
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
    mockEvaluate.mockImplementation(() => Promise.resolve('Sample visible text content'));
    mockLocator.mockReset();
  });

  test('should retrieve visible text content', async () => {
    const args = {};

    const result = await visibleTextTool.execute(args, mockContext);

    expect(mockEvaluate).toHaveBeenCalled();
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Visible text content');
    expect(result.content[0].text).toContain('Sample visible text content');
  });

  test('should handle missing page', async () => {
    const args = {};

    // Context with browser but without page
    const contextWithoutPage = {
      browser: mockBrowser,
      server: mockServer
    } as unknown as ToolContext;

    const result = await visibleTextTool.execute(args, contextWithoutPage);

    expect(mockEvaluate).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Page is not available');
  });
  
  test('should handle disconnected browser', async () => {
    const args = {};
    
    // Mock disconnected browser
    mockIsConnected.mockReturnValueOnce(false);
    
    const result = await visibleTextTool.execute(args, mockContext);
    
    expect(mockEvaluate).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser is not connected');
  });
  
  test('should handle closed page', async () => {
    const args = {};
    
    // Mock closed page
    mockIsClosed.mockReturnValueOnce(true);
    
    const result = await visibleTextTool.execute(args, mockContext);
    
    expect(mockEvaluate).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Page is not available or has been closed');
  });

  test('should handle evaluation errors', async () => {
    const args = {};

    // Mock evaluation error
    mockEvaluate.mockImplementationOnce(() => Promise.reject(new Error('Evaluation failed')));

    const result = await visibleTextTool.execute(args, mockContext);

    expect(mockEvaluate).toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to get visible text content');
    expect(result.content[0].text).toContain('Evaluation failed');
  });

  test('should include guidance tip in response', async () => {
    const args = {};

    const result = await visibleTextTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('💡 TIP: If you need structured inspection');
    expect(result.content[0].text).toContain('inspect_dom()');
    expect(result.content[0].text).toContain('find_by_text');
    expect(result.content[0].text).toContain('query_selector');
  });

  test('should retrieve text from specific selector', async () => {
    const args = { selector: '#main-content' };

    mockLocator.mockImplementation(() => ({}));
    const mockElement = {
      evaluate: jest.fn(async () => 'Article text from main content'),
    };
    const selectSpy = jest
      .spyOn(visibleTextTool as any, 'selectPreferredLocator')
      .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });

    const result = await visibleTextTool.execute(args, mockContext);

    expect(mockLocator).toHaveBeenCalledWith('#main-content');
    expect(mockElement.evaluate).toHaveBeenCalled();
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('(from "#main-content")');
    expect(result.content[0].text).toContain('Article text from main content');
    selectSpy.mockRestore();
  });

  test('should support testid shorthand selector', async () => {
    const args = { selector: 'testid:article-body' };

    mockLocator.mockImplementation(() => ({}));
    const mockElement = {
      evaluate: jest.fn(async () => 'Article text'),
    };
    const selectSpy = jest
      .spyOn(visibleTextTool as any, 'selectPreferredLocator')
      .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });

    const result = await visibleTextTool.execute(args, mockContext);

    expect(mockLocator).toHaveBeenCalledWith('[data-testid="article-body"]');
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('(from "testid:article-body")');
    expect(result.content[0].text).toContain('Article text');
    selectSpy.mockRestore();
  });

  test('should handle non-existent selector', async () => {
    const args = { selector: '#non-existent' };

    mockLocator.mockImplementation(() => ({}));
    const selectSpy = jest
      .spyOn(visibleTextTool as any, 'selectPreferredLocator')
      .mockRejectedValue(new Error('No elements found'));

    const result = await visibleTextTool.execute(args, mockContext);

    expect(mockLocator).toHaveBeenCalledWith('#non-existent');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to get visible text content: No elements found');
    selectSpy.mockRestore();
  });

  test('should respect maxLength parameter', async () => {
    const args = { maxLength: 50 };

    // Mock long text content
    const longText = 'A'.repeat(100);
    mockEvaluate.mockImplementationOnce(() => Promise.resolve(longText));

    const result = await visibleTextTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Output truncated due to size limits');
    // Content should be truncated (50 chars + newline + truncation message)
    const contentText = result.content[0].text as string;
    const contentMatch = contentText.match(/Visible text content[\s\S]*?💡 TIP/);
    if (contentMatch) {
      const textPortion = contentMatch[0].replace(/💡 TIP$/, '');
      // Should contain truncated text plus truncation message
      expect(textPortion).toContain('A'.repeat(50));
      expect(textPortion).toContain('[Output truncated due to size limits]');
    }
  });

  test('should show "entire page" when no selector provided', async () => {
    const args = {};

    const result = await visibleTextTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('(entire page)');
    expect(result.content[0].text).not.toContain('(from');
  });

  test('should combine selector and maxLength parameters', async () => {
    const args = { selector: 'testid:article', maxLength: 30 };

    mockLocator.mockImplementation(() => ({}));
    const mockElement = {
      evaluate: jest.fn(async () => 'B'.repeat(100)),
    };
    const selectSpy = jest
      .spyOn(visibleTextTool as any, 'selectPreferredLocator')
      .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });

    const result = await visibleTextTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('(from "testid:article")');
    expect(result.content[0].text).toContain('[Output truncated due to size limits]');
    selectSpy.mockRestore();
  });
});

describe('VisibleHtmlTool', () => {
  let visibleHtmlTool: VisibleHtmlTool;

  beforeEach(() => {
    jest.clearAllMocks();
    visibleHtmlTool = new VisibleHtmlTool(mockServer);
    // Reset mocks
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
    mockContent.mockImplementation(() => Promise.resolve('<html><body>Sample HTML content</body></html>'));
    mockLocator.mockReset();
  });

  test('should retrieve HTML content with scripts removed by default', async () => {
    const args = {};

    // Mock evaluate to process HTML
    mockEvaluate.mockImplementationOnce(() => Promise.resolve('<html><body>Sample HTML content</body></html>'));

    const result = await visibleHtmlTool.execute(args, mockContext);

    expect(mockContent).toHaveBeenCalled();
    expect(mockEvaluate).toHaveBeenCalled();
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('HTML content');
    expect(result.content[0].text).toContain('scripts removed');
    expect(result.content[0].text).toContain('Sample HTML content');
  });

  test('should include guidance tip in response', async () => {
    const args = {};

    mockEvaluate.mockImplementationOnce(() => Promise.resolve('<html><body>Content</body></html>'));

    const result = await visibleHtmlTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('💡 TIP: If you need structured inspection');
    expect(result.content[0].text).toContain('inspect_dom()');
    expect(result.content[0].text).toContain('query_selector');
    expect(result.content[0].text).toContain('get_computed_styles');
  });

  test('should apply clean mode when clean=true', async () => {
    const args = { clean: true };

    // Mock the page.evaluate to capture the clean parameter
    mockEvaluate.mockImplementationOnce((callback, params) => {
      expect(params).toEqual({
        html: '<html><body>Sample HTML content</body></html>',
        clean: true
      });
      return Promise.resolve('<html><body>Clean HTML content</body></html>');
    });

    const result = await visibleHtmlTool.execute(args, mockContext);

    expect(mockContent).toHaveBeenCalled();
    expect(mockEvaluate).toHaveBeenCalled();
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('clean mode');
    expect(result.content[0].text).toContain('Clean HTML content');
  });

  test('should default to clean=false (scripts only)', async () => {
    const args = {};

    mockEvaluate.mockImplementationOnce((callback, params: any) => {
      expect(params.clean).toBe(false);
      return Promise.resolve('<html><body>HTML with scripts removed</body></html>');
    });

    const result = await visibleHtmlTool.execute(args, mockContext);
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('scripts removed');
  });

  test('should handle selector parameter', async () => {
    const args = {
      selector: '#main-content'
    };

    mockLocator.mockImplementation(() => ({}));
    const mockElement = {
      evaluate: jest.fn(async () => '<div id="main-content">Selected content</div>'),
    };
    const selectSpy = jest
      .spyOn(visibleHtmlTool as any, 'selectPreferredLocator')
      .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });

    mockEvaluate.mockResolvedValueOnce('<div id="main-content">Processed selected content</div>');

    const result = await visibleHtmlTool.execute(args, mockContext);
    expect(mockLocator).toHaveBeenCalledWith('#main-content');
    expect(mockElement.evaluate).toHaveBeenCalled();
    expect(mockEvaluate).toHaveBeenCalled();
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('(from "#main-content")');
    expect(result.content[0].text).toContain('Processed selected content');
    selectSpy.mockRestore();
  });

  test('should support testid shorthand selector', async () => {
    const args = { selector: 'testid:main-app' };

    mockLocator.mockImplementation(() => ({}));
    const mockElement = {
      evaluate: jest.fn(async () => '<div data-testid="main-app">App content</div>'),
    };
    const selectSpy = jest
      .spyOn(visibleHtmlTool as any, 'selectPreferredLocator')
      .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });

    mockEvaluate.mockResolvedValueOnce('<div data-testid="main-app">App content</div>');

    const result = await visibleHtmlTool.execute(args, mockContext);

    // Should normalize testid: to [data-testid="..."]
    expect(mockLocator).toHaveBeenCalledWith('[data-testid="main-app"]');
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('(from "testid:main-app")');
    selectSpy.mockRestore();
  });

  test('should handle non-existent selector', async () => {
    const args = { selector: '#non-existent' };

    mockLocator.mockImplementation(() => ({}));
    const selectSpy = jest
      .spyOn(visibleHtmlTool as any, 'selectPreferredLocator')
      .mockRejectedValue(new Error('No elements found'));

    const result = await visibleHtmlTool.execute(args, mockContext);

    expect(mockLocator).toHaveBeenCalledWith('#non-existent');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to get visible HTML content: No elements found');
    selectSpy.mockRestore();
  });

  test('should handle empty HTML content', async () => {
    const args = {};

    // Mock content to return empty HTML
    mockContent.mockImplementationOnce(() => Promise.resolve(''));

    mockEvaluate.mockImplementationOnce(() => Promise.resolve(''));

    const result = await visibleHtmlTool.execute(args, mockContext);
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('HTML content');
  });

  test('should respect maxLength parameter', async () => {
    const args = { maxLength: 50 };

    const longHtml = '<div>' + 'A'.repeat(100) + '</div>';
    mockEvaluate.mockImplementationOnce(() => Promise.resolve(longHtml));

    const result = await visibleHtmlTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Output truncated due to size limits');
  });

  test('should show "entire page" when no selector provided', async () => {
    const args = {};

    mockEvaluate.mockImplementationOnce(() => Promise.resolve('<html><body>Content</body></html>'));

    const result = await visibleHtmlTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('(entire page)');
    expect(result.content[0].text).not.toContain('(from');
  });

  test('should combine selector, clean, and maxLength parameters', async () => {
    const args = { selector: 'testid:app', clean: true, maxLength: 30 };

    mockLocator.mockImplementation(() => ({}));
    const longHtml = '<div>' + 'B'.repeat(100) + '</div>';
    const mockElement = {
      evaluate: jest.fn(async () => longHtml),
    };
    const selectSpy = jest
      .spyOn(visibleHtmlTool as any, 'selectPreferredLocator')
      .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });

    mockEvaluate.mockImplementationOnce((callback, params: any) => {
      expect(params.clean).toBe(true);
      expect(params.html).toBe(longHtml);
      return Promise.resolve(longHtml);
    });

    const result = await visibleHtmlTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('(from "testid:app")');
    expect(result.content[0].text).toContain('clean mode');
    expect(result.content[0].text).toContain('<!-- Output truncated due to size limits -->');
    selectSpy.mockRestore();
  });

  test('should handle missing page', async () => {
    const args = {};

    // Context with browser but without page
    const contextWithoutPage = {
      browser: mockBrowser,
      server: mockServer
    } as unknown as ToolContext;

    const result = await visibleHtmlTool.execute(args, contextWithoutPage);

    expect(mockContent).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Page is not available');
  });
  
  test('should handle disconnected browser', async () => {
    const args = {};
    
    // Mock disconnected browser
    mockIsConnected.mockReturnValueOnce(false);
    
    const result = await visibleHtmlTool.execute(args, mockContext);
    
    expect(mockContent).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser is not connected');
  });
  
  test('should handle closed page', async () => {
    const args = {};
    
    // Mock closed page
    mockIsClosed.mockReturnValueOnce(true);
    
    const result = await visibleHtmlTool.execute(args, mockContext);
    
    expect(mockContent).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Page is not available or has been closed');
  });

  test('should handle content retrieval errors', async () => {
    const args = {};

    // Mock content error
    mockContent.mockImplementationOnce(() => Promise.reject(new Error('Content retrieval failed')));

    const result = await visibleHtmlTool.execute(args, mockContext);

    expect(mockContent).toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to get visible HTML content');
    expect(result.content[0].text).toContain('Content retrieval failed');
  });
});
