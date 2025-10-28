import { ScrollToElementTool } from '../scroll_to_element.js';
import { ScrollByTool } from '../scroll_by.js';
import { ToolContext } from '../../../common/types.js';
import { Page, Browser, Locator } from 'playwright';
import { jest } from '@jest/globals';

// Mock locator functions
const mockScrollIntoViewIfNeeded = jest.fn().mockImplementation(() => Promise.resolve());
const mockEvaluate = jest.fn().mockImplementation(() => Promise.resolve());
const mockCount = jest.fn().mockReturnValue(Promise.resolve(1));
const mockGetAttribute = jest.fn().mockImplementation((attr: unknown) => {
  if (attr === 'data-testid') return Promise.resolve('test-element');
  return Promise.resolve(null);
});

// Mock the Locator object
const mockLocator = {
  scrollIntoViewIfNeeded: mockScrollIntoViewIfNeeded,
  evaluate: mockEvaluate,
  count: mockCount,
  getAttribute: mockGetAttribute,
  first: jest.fn().mockReturnThis()
} as unknown as Locator;

// Mock page.locator function
const mockPageLocator = jest.fn().mockReturnValue(mockLocator);

// Mock page.evaluate for scroll_by
const mockPageEvaluate = jest.fn().mockImplementation((fn, arg) => {
  // Simulate scrolling the page
  if (typeof fn === 'function') {
    return Promise.resolve({
      previous: 0,
      new: arg,
      actualScrolled: arg,
      maxScroll: 1000
    });
  }
  return Promise.resolve();
});

const mockIsClosed = jest.fn().mockReturnValue(false);

// Mock the Page object with proper typing
const mockPage = {
  locator: mockPageLocator,
  evaluate: mockPageEvaluate,
  isClosed: mockIsClosed
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

describe('Scroll Tools', () => {
  let scrollToElementTool: ScrollToElementTool;
  let scrollByTool: ScrollByTool;

  beforeEach(() => {
    jest.clearAllMocks();
    scrollToElementTool = new ScrollToElementTool(mockServer);
    scrollByTool = new ScrollByTool(mockServer);
    // Reset browser and page mocks
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
    mockCount.mockReturnValue(Promise.resolve(1));
  });

  describe('ScrollToElementTool', () => {
    test('should scroll element into view with default position', async () => {
      const args = { selector: 'testid:submit-btn' };

      // Mock element evaluation
      mockEvaluate.mockImplementationOnce(() => Promise.resolve('button'));

      const result = await scrollToElementTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('[data-testid="submit-btn"]');
      expect(mockScrollIntoViewIfNeeded).toHaveBeenCalled();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Scrolled to element');

      // Should suggest verifying visibility
      const fullResponse = result.content.map(c => c.text).join('\n');
      expect(fullResponse).toContain('💡 Common next step');
      expect(fullResponse).toContain('element_visibility');
    });

    test('should scroll element into view with center position', async () => {
      const args = { selector: 'testid:submit-btn', position: 'center' };

      // Mock element evaluation
      mockEvaluate
        .mockImplementationOnce((fn) => {
          // Simulate scrollIntoView with center
          if (typeof fn === 'function') {
            const mockEl = {
              scrollIntoView: jest.fn()
            };
            fn(mockEl);
          }
          return Promise.resolve();
        })
        .mockImplementationOnce(() => Promise.resolve('button'));

      const result = await scrollToElementTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('[data-testid="submit-btn"]');
      expect(mockEvaluate).toHaveBeenCalled();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('center');
    });

    test('should scroll element into view with end position', async () => {
      const args = { selector: 'testid:submit-btn', position: 'end' };

      // Mock element evaluation
      mockEvaluate
        .mockImplementationOnce((fn) => {
          // Simulate scrollIntoView with end
          if (typeof fn === 'function') {
            const mockEl = {
              scrollIntoView: jest.fn()
            };
            fn(mockEl);
          }
          return Promise.resolve();
        })
        .mockImplementationOnce(() => Promise.resolve('button'));

      const result = await scrollToElementTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('[data-testid="submit-btn"]');
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('end');
    });

    test('should handle element not found', async () => {
      const args = { selector: 'testid:nonexistent' };
      mockCount.mockReturnValueOnce(Promise.resolve(0));

      const result = await scrollToElementTool.execute(args, mockContext);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Element not found');
    });

    test('should handle missing page', async () => {
      const args = { selector: 'testid:submit-btn' };

      const result = await scrollToElementTool.execute(args, { server: mockServer } as ToolContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Browser page not initialized');
    });
  });

  describe('ScrollByTool', () => {
    test('should scroll page by positive pixels', async () => {
      const args = { selector: 'html', pixels: 500 };

      mockPageEvaluate.mockImplementationOnce((fn, pixels) => {
        return Promise.resolve({
          previous: 0,
          new: pixels,
          actualScrolled: pixels,
          maxScroll: 1000
        });
      });

      const result = await scrollByTool.execute(args, mockContext);

      expect(mockPageEvaluate).toHaveBeenCalled();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Scrolled page down 500px');

      // Should suggest testing sticky headers when scrolling down and not hitting boundary
      const fullResponse = result.content.map(c => c.text).join('\n');
      expect(fullResponse).toContain('💡 Common next step');
      expect(fullResponse).toContain('sticky header');
      expect(fullResponse).toContain('measure_element');
    });

    test('should scroll page by negative pixels', async () => {
      const args = { selector: 'body', pixels: -200 };

      mockPageEvaluate.mockImplementationOnce((fn, pixels) => {
        return Promise.resolve({
          previous: 500,
          new: 300,
          actualScrolled: pixels,
          maxScroll: 1000
        });
      });

      const result = await scrollByTool.execute(args, mockContext);

      expect(mockPageEvaluate).toHaveBeenCalled();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Scrolled page up 200px');
    });

    test('should detect hitting bottom of page', async () => {
      const args = { selector: 'html', pixels: 1000 };

      mockPageEvaluate.mockImplementationOnce((fn, pixels) => {
        return Promise.resolve({
          previous: 500,
          new: 800,
          actualScrolled: 300, // Only scrolled 300px, not full 1000px
          maxScroll: 800
        });
      });

      const result = await scrollByTool.execute(args, mockContext);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Scrolled page down 1000px');
      expect(result.content.some(c => typeof c.text === 'string' && c.text.includes('Reached bottom'))).toBe(true);

      // Should suggest checking for infinite scroll/lazy-loaded content at bottom
      const fullResponse = result.content.map(c => c.text).join('\n');
      expect(fullResponse).toContain('💡 At page bottom');
      expect(fullResponse).toContain('dynamic content');
      expect(fullResponse).toContain('element_visibility');
    });

    test('should scroll element container by pixels', async () => {
      const args = { selector: 'testid:chat-container', pixels: 300 };

      // Mock element evaluation for scrolling
      mockEvaluate.mockImplementationOnce((fn, pixels) => {
        return Promise.resolve({
          previous: 0,
          new: pixels,
          actualScrolled: pixels,
          maxScroll: 1000,
          tagName: 'div',
          testId: 'chat-container',
          id: null,
          className: ''
        });
      });

      const result = await scrollByTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('[data-testid="chat-container"]');
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Scrolled <div data-testid="chat-container"> down 300px');
    });

    test('should handle element not found', async () => {
      const args = { selector: 'testid:nonexistent', pixels: 100 };
      mockCount.mockReturnValueOnce(Promise.resolve(0));

      const result = await scrollByTool.execute(args, mockContext);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Element not found');
    });

    test('should detect hitting bottom of container', async () => {
      const args = { selector: 'testid:chat-container', pixels: 500 };

      // Mock element evaluation
      mockEvaluate.mockImplementationOnce((fn, pixels) => {
        return Promise.resolve({
          previous: 200,
          new: 400,
          actualScrolled: 200, // Only scrolled 200px, not full 500px
          maxScroll: 400,
          tagName: 'div',
          testId: 'chat-container',
          id: null,
          className: ''
        });
      });

      const result = await scrollByTool.execute(args, mockContext);

      expect(result.isError).toBe(false);
      expect(result.content.some(c => typeof c.text === 'string' && c.text.includes('Reached bottom'))).toBe(true);

      // Should suggest checking for lazy-loaded content in container
      const fullResponse = result.content.map(c => c.text).join('\n');
      expect(fullResponse).toContain('💡 At container bottom');
      expect(fullResponse).toContain('lazy-loaded content');
      expect(fullResponse).toContain('inspect_dom');
    });

    test('should handle missing page', async () => {
      const args = { selector: 'html', pixels: 100 };

      const result = await scrollByTool.execute(args, { server: mockServer } as ToolContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Browser page not initialized');
    });
  });
});
