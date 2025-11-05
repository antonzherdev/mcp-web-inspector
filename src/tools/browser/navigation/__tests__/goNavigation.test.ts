import { GoHistoryTool } from '../history.js';
import { ToolContext } from '../../../common/types.js';
import { Page, Browser } from 'playwright';
import { jest } from '@jest/globals';

// Mock page functions
const mockGoBack = jest.fn().mockImplementation(() => Promise.resolve());
const mockGoForward = jest.fn().mockImplementation(() => Promise.resolve());
const mockIsClosed = jest.fn().mockReturnValue(false);

// Mock the Page object with proper typing
const mockPage = {
  goBack: mockGoBack,
  goForward: mockGoForward,
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

describe('Browser Navigation History Tool', () => {
  let historyTool: GoHistoryTool;

  beforeEach(() => {
    jest.clearAllMocks();
    historyTool = new GoHistoryTool(mockServer);
    // Reset browser and page mocks
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
  });

  describe('HistoryTool', () => {
    test('should navigate back in browser history', async () => {
      const args = { direction: 'back' };

      const result = await historyTool.execute(args, mockContext);

      expect(mockGoBack).toHaveBeenCalled();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Navigated back');
    });

    test('should navigate forward in browser history', async () => {
      const args = { direction: 'forward' };

      const result = await historyTool.execute(args, mockContext);

      expect(mockGoForward).toHaveBeenCalled();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Navigated forward');
    });

    test('should handle navigation back errors', async () => {
      const args = { direction: 'back' };

      // Mock a navigation error
      mockGoBack.mockImplementationOnce(() => Promise.reject(new Error('Navigation back failed')));

      const result = await historyTool.execute(args, mockContext);

      expect(mockGoBack).toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Operation failed');
    });

    test('should handle navigation forward errors', async () => {
      const args = { direction: 'forward' };

      // Mock a navigation error
      mockGoForward.mockImplementationOnce(() => Promise.reject(new Error('Navigation forward failed')));

      const result = await historyTool.execute(args, mockContext);

      expect(mockGoForward).toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Operation failed');
    });

    test('should handle missing page', async () => {
      const args = { direction: 'back' };

      const result = await historyTool.execute(args, { server: mockServer } as ToolContext);

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Browser page not initialized');
    });
  });
}); 
