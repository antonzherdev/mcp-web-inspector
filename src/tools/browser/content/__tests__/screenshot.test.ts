import { ScreenshotTool } from '../screenshot.js';
import { ToolContext } from '../../../common/types.js';
import { Page, Browser } from 'playwright';
import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

// Mock fs module
jest.mock('node:fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Mock the Page object
const mockScreenshot = jest.fn().mockImplementation(() => 
  Promise.resolve(Buffer.from('mock-screenshot')));

const mockLocatorScreenshot = jest.fn().mockImplementation(() => 
  Promise.resolve(Buffer.from('mock-element-screenshot')));

const mockElementHandle = {
  screenshot: mockLocatorScreenshot
};

const mockElement = jest.fn().mockImplementation(() => Promise.resolve(mockElementHandle));

const mockLocator = jest.fn().mockReturnValue({
  screenshot: mockLocatorScreenshot
});

const mockIsClosed = jest.fn().mockReturnValue(false);
const mockPage = {
  screenshot: mockScreenshot,
  locator: mockLocator,
  $: mockElement,
  isClosed: mockIsClosed
} as unknown as Page;

// Mock browser
const mockIsConnected = jest.fn().mockReturnValue(true);
const mockBrowser = {
  isConnected: mockIsConnected
} as unknown as Browser;

// Mock the server
const mockServer = {
  sendMessage: jest.fn(),
  notification: jest.fn()
};

// Mock context
const mockContext = {
  page: mockPage,
  browser: mockBrowser,
  server: mockServer
} as ToolContext;

describe('ScreenshotTool', () => {
  let screenshotTool: ScreenshotTool;

  beforeEach(() => {
    jest.clearAllMocks();
    screenshotTool = new ScreenshotTool(mockServer);
    
    // Mock Date to return a consistent value for testing
    jest.spyOn(global.Date.prototype, 'toISOString').mockReturnValue('2023-01-01T12:00:00.000Z');
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should take a full page screenshot (via confirm_output)', async () => {
    const args = {
      name: 'test-screenshot',
      fullPage: true
    };

    // First call returns preview with confirm token; no screenshot yet
    const previewResult = await screenshotTool.execute(args, mockContext);
    expect(previewResult.isError).toBe(false);
    const text = previewResult.content.map(c => c.text).join('\n');
    expect(text).toMatch(/confirm_output\(\{ token: \"[\w\d]+\" \}\)/);

    // Extract token and confirm
    const tokenMatch = text.match(/confirm_output\(\{ token: \"([\w\d]+)\" \}\)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    const { ConfirmOutputTool } = await import('../../../common/confirm_output.js');
    const confirmTool = new ConfirmOutputTool({});

    const screenshotBuffer = Buffer.from('mock-screenshot');
    mockScreenshot.mockImplementationOnce(() => Promise.resolve(screenshotBuffer));

    const finalResult = await confirmTool.execute({ token }, mockContext);
    expect(finalResult.isError).toBe(false);
    expect(finalResult.content[0].text).toContain('Screenshot saved to');
    expect(mockScreenshot).toHaveBeenCalledWith(expect.objectContaining({ fullPage: true, type: 'png' }));
  });

  test('should handle element screenshot (via confirm_output)', async () => {
    const args = {
      name: 'test-element-screenshot',
      selector: '#test-element'
    };

    const previewResult = await screenshotTool.execute(args, mockContext);
    expect(previewResult.isError).toBe(false);
    const text = previewResult.content.map(c => c.text).join('\n');
    const tokenMatch = text.match(/confirm_output\(\{ token: \"([\w\d]+)\" \}\)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    const { ConfirmOutputTool } = await import('../../../common/confirm_output.js');
    const confirmTool = new ConfirmOutputTool({});

    const screenshotBuffer = Buffer.from('mock-element-screenshot');
    mockLocatorScreenshot.mockImplementationOnce(() => Promise.resolve(screenshotBuffer));

    const finalResult = await confirmTool.execute({ token }, mockContext);
    expect(finalResult.isError).toBe(false);
    expect(finalResult.content[0].text).toContain('Screenshot saved to');
  });

  test('should handle screenshot errors (on confirm)', async () => {
    const args = {
      name: 'test-screenshot'
    };

    const previewResult = await screenshotTool.execute(args, mockContext);
    expect(previewResult.isError).toBe(false);
    const text = previewResult.content.map(c => c.text).join('\n');
    const tokenMatch = text.match(/confirm_output\(\{ token: \"([\w\d]+)\" \}\)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    const { ConfirmOutputTool } = await import('../../../common/confirm_output.js');
    const confirmTool = new ConfirmOutputTool({});

    // Mock a screenshot error on confirmation
    mockScreenshot.mockImplementationOnce(() => Promise.reject(new Error('Screenshot failed')));
    const finalResult = await confirmTool.execute({ token }, mockContext);
    expect(finalResult.isError).toBe(true);
    expect(finalResult.content[0].text).toContain('Screenshot failed');
  });

  test('should handle missing page', async () => {
    const args = {
      name: 'test-screenshot'
    };

    // Context without page but with browser
    const contextWithoutPage = {
      browser: mockBrowser,
      server: mockServer
    } as unknown as ToolContext;

    const result = await screenshotTool.execute(args, contextWithoutPage);
    expect(mockScreenshot).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser page not initialized');
  });

  test('should store screenshots in a map (after confirm)', async () => {
    const args = {
      name: 'test-screenshot',
      storeBase64: true
    };

    const preview = await screenshotTool.execute(args, mockContext);
    const token = (preview.content.map(c => c.text).join('\n').match(/confirm_output\(\{ token: \"([\w\d]+)\" \}\)/) || [])[1];
    const { ConfirmOutputTool } = await import('../../../common/confirm_output.js');
    const confirmTool = new ConfirmOutputTool({});
    mockScreenshot.mockImplementationOnce(() => Promise.resolve(Buffer.from('mock-screenshot')));
    await confirmTool.execute({ token }, mockContext);
    
    // Check that the screenshot was stored in the map
    const screenshots = screenshotTool.getScreenshots();
    expect(screenshots.has('test-screenshot')).toBe(true);
  });

  test('should take a screenshot with specific browser type (via confirm_output)', async () => {
    const args = {
      name: 'browser-type-test',
      browserType: 'firefox'
    };

    const preview = await screenshotTool.execute(args, mockContext);
    const text = preview.content.map(c => c.text).join('\n');
    const token = (text.match(/confirm_output\(\{ token: \"([\w\d]+)\" \}\)/) || [])[1];
    const { ConfirmOutputTool } = await import('../../../common/confirm_output.js');
    const confirmTool = new ConfirmOutputTool({});
    mockScreenshot.mockImplementationOnce(() => Promise.resolve(Buffer.from('mock-screenshot')));
    const result = await confirmTool.execute({ token }, mockContext);
    expect(mockScreenshot).toHaveBeenCalled();
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Screenshot saved to');
  });

  test('preview should suggest alternative tools', async () => {
    const args = {
      name: 'test-screenshot',
      fullPage: true
    };

    const result = await screenshotTool.execute(args, mockContext);
    expect(result.isError).toBe(false);
    const fullResponseText = result.content.map(c => c.text).join('\n');
    expect(fullResponseText).toContain('Screenshot requested');
    expect(fullResponseText).toContain('inspect_dom');
    expect(fullResponseText).toContain('compare_element_alignment');
    expect(fullResponseText).toContain('get_computed_styles');
    expect(fullResponseText).toContain('inspect_ancestors');
  });

  test('preview should also suggest alternatives for element screenshots', async () => {
    const args = {
      name: 'test-element-screenshot',
      selector: '#test-element'
    };

    const result = await screenshotTool.execute(args, mockContext);
    expect(result.isError).toBe(false);
    const fullResponseText = result.content.map(c => c.text).join('\n');
    expect(fullResponseText).toContain('Screenshot requested');
    expect(fullResponseText).toContain('inspect_dom');
  });
}); 
