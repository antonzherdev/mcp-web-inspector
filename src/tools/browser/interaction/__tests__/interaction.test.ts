import { ClickTool } from '../click.js';
import { FillTool } from '../fill.js';
import { SelectTool } from '../select.js';
import { HoverTool } from '../hover.js';
import { UploadFileTool } from '../upload_file.js';
import { EvaluateTool } from '../../evaluation/evaluate.js';
import { NavigateTool } from '../../navigation/navigate.js';
import { ToolContext } from '../../../common/types.js';
import { Page, Browser } from 'playwright';
import { jest } from '@jest/globals';

// Mock page functions
const mockPageClick = jest.fn().mockImplementation(() => Promise.resolve());
const mockWaitForLoadState = jest.fn().mockImplementation(() => Promise.resolve());
const mockBringToFront = jest.fn().mockImplementation(() => Promise.resolve());
const mockUrl = jest.fn().mockReturnValue('https://example.com');
const mockOn = jest.fn().mockImplementation(() => {});
const mockAddInitScript = jest.fn().mockImplementation(() => Promise.resolve());

// Mock new page with methods required by registerConsoleMessage
const mockNewPage = {
  waitForLoadState: mockWaitForLoadState,
  bringToFront: mockBringToFront,
  url: mockUrl,
  on: mockOn,
  addInitScript: mockAddInitScript,
} as unknown as Page;

const mockWaitForEvent = jest.fn().mockImplementation(() => Promise.resolve(mockNewPage));



// Mock locator functions
const mockPageLocator = jest.fn().mockReturnValue({});

// Mock iframe locator
const mockIframeLocatorClick = jest.fn(async () => {});
const mockIframeLocator = jest.fn().mockReturnValue({
  click: mockIframeLocatorClick,
});

// Mock frame locator
const mockFrameLocator = jest.fn().mockReturnValue({
  locator: mockIframeLocator
});

// Mock evaluate function
const mockEvaluate = jest.fn().mockImplementation(() => Promise.resolve('test-result'));

// Mock the Page object with proper typing
const mockGoto = jest.fn().mockImplementation(() => Promise.resolve());
const mockIsClosed = jest.fn().mockReturnValue(false);

const mockPage = {
  click: mockPageClick,
  locator: mockPageLocator,
  frameLocator: mockFrameLocator,
  evaluate: mockEvaluate,
  goto: mockGoto,
  isClosed: mockIsClosed,
  context: jest.fn(() => ({
    waitForEvent: mockWaitForEvent,
  })),
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

describe('Browser Interaction Tools', () => {
  let clickTool: ClickTool;
  let fillTool: FillTool;
  let selectTool: SelectTool;
  let hoverTool: HoverTool;
  let evaluateTool: EvaluateTool;
  let uploadFileTool: UploadFileTool;

  beforeEach(() => {
    jest.clearAllMocks();
    clickTool = new ClickTool(mockServer);
    fillTool = new FillTool(mockServer);
    selectTool = new SelectTool(mockServer);
    hoverTool = new HoverTool(mockServer);
    evaluateTool = new EvaluateTool(mockServer);
    uploadFileTool = new UploadFileTool(mockServer);
    mockPageLocator.mockReset();
    mockPageLocator.mockImplementation(() => ({}));
  });

  describe('ClickTool', () => {
    test('should click an element', async () => {
      const args = {
        selector: '#test-button'
      };

      const mockElement = {
        click: jest.fn(async () => {}),
      };
      const selectSpy = jest
        .spyOn(clickTool as any, 'selectPreferredLocator')
        .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });
      mockPageLocator.mockImplementation(() => ({}));

      const result = await clickTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('#test-button');
      expect(mockElement.click).toHaveBeenCalled();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Clicked element');
      selectSpy.mockRestore();
    });

    test('should handle click errors', async () => {
      const args = {
        selector: '#test-button'
      };

      const mockElement = {
        click: jest.fn(async () => {}),
      };
      mockElement.click.mockRejectedValue(new Error('Click failed'));
      const selectSpy = jest
        .spyOn(clickTool as any, 'selectPreferredLocator')
        .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });
      mockPageLocator.mockImplementation(() => ({}));

      const result = await clickTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('#test-button');
      expect(mockElement.click).toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Operation failed');
      selectSpy.mockRestore();
    });

    test('should handle missing page', async () => {
      const args = {
        selector: '#test-button'
      };

      const result = await clickTool.execute(args, { server: mockServer } as ToolContext);

      expect(mockPageLocator).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Browser page not initialized');
    });
  });

  describe('FillTool', () => {
    test('should fill an input field', async () => {
      const args = {
        selector: '#test-input',
        value: 'test value'
      };

      const mockElement = {
        fill: jest.fn(async () => {}),
      };
      const selectSpy = jest
        .spyOn(fillTool as any, 'selectPreferredLocator')
        .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });
      mockPageLocator.mockImplementation(() => ({}));

      const result = await fillTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('#test-input');
      expect(mockElement.fill).toHaveBeenCalledWith('test value');
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Filled');
      selectSpy.mockRestore();
    });
  });

  describe('SelectTool', () => {
    test('should select an option', async () => {
      const args = {
        selector: '#test-select',
        value: 'option1'
      };

      const mockElement = {
        selectOption: jest.fn(async () => {}),
      };
      const selectSpy = jest
        .spyOn(selectTool as any, 'selectPreferredLocator')
        .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });
      mockPageLocator.mockImplementation(() => ({}));

      const result = await selectTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('#test-select');
      expect(mockElement.selectOption).toHaveBeenCalledWith('option1');
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Selected');
      selectSpy.mockRestore();
    });
  });

  describe('HoverTool', () => {
    test('should hover over an element', async () => {
      const args = {
        selector: '#test-element'
      };

      const mockElement = {
        hover: jest.fn(async () => {}),
      };
      const selectSpy = jest
        .spyOn(hoverTool as any, 'selectPreferredLocator')
        .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });
      mockPageLocator.mockImplementation(() => ({}));

      const result = await hoverTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('#test-element');
      expect(mockElement.hover).toHaveBeenCalled();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Hovered');
      selectSpy.mockRestore();
    });
  });

  describe('UploadFileTool', () => {
    test('should upload a file to an input element', async () => {
      const args = {
        selector: '#file-input',
        filePath: '/tmp/testfile.txt'
      };

      const mockElement = {
        setInputFiles: jest.fn(async () => {}),
      };
      const selectSpy = jest
        .spyOn(uploadFileTool as any, 'selectPreferredLocator')
        .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });
      mockPageLocator.mockImplementation(() => ({}));

      const result = await uploadFileTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('#file-input');
      expect(mockElement.setInputFiles).toHaveBeenCalledWith('/tmp/testfile.txt');
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Uploaded file '/tmp/testfile.txt' to '#file-input'");
      selectSpy.mockRestore();
    });
  });

  describe('EvaluateTool', () => {
    test('should evaluate JavaScript', async () => {
      const args = {
        script: 'return document.title'
      };

      const result = await evaluateTool.execute(args, mockContext);

      expect(mockEvaluate).toHaveBeenCalledWith('return document.title');
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('JavaScript execution result');
    });

    test('should suggest inspect_dom for querySelector usage', async () => {
      const args = {
        script: 'document.querySelector("#test").innerHTML'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      expect(fullResponse).toContain('💡 Consider using specialized tools instead');
      expect(fullResponse).toContain('inspect_dom');
    });

    test('should suggest get_visible_text for textContent usage', async () => {
      const args = {
        script: 'document.body.textContent'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      expect(fullResponse).toContain('💡 Consider using specialized tools instead');
      expect(fullResponse).toContain('get_visible_text');
    });

    test('should suggest measure_element for getBoundingClientRect usage', async () => {
      const args = {
        script: 'document.querySelector("#box").getBoundingClientRect()'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      expect(fullResponse).toContain('💡 Consider using specialized tools instead');
      expect(fullResponse).toContain('measure_element');
    });

    test('should suggest element_visibility for visibility checks', async () => {
      const args = {
        script: 'window.getComputedStyle(document.querySelector("#el")).visibility'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      expect(fullResponse).toContain('💡 Consider using specialized tools instead');
      expect(fullResponse).toContain('element_visibility');
    });

    test('should suggest get_computed_styles for getComputedStyle usage', async () => {
      const args = {
        script: 'window.getComputedStyle(document.querySelector("#el"))'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      expect(fullResponse).toContain('💡 Consider using specialized tools instead');
      expect(fullResponse).toContain('get_computed_styles');
    });

    test('should suggest element_exists for existence checks', async () => {
      const args = {
        script: 'document.querySelector("#test") !== null'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      expect(fullResponse).toContain('💡 Consider using specialized tools instead');
      expect(fullResponse).toContain('element_exists');
    });

    test('should suggest get_test_ids for data-testid queries', async () => {
      const args = {
        script: 'document.querySelectorAll("[data-testid]")'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      expect(fullResponse).toContain('💡 Consider using specialized tools instead');
      expect(fullResponse).toContain('get_test_ids');
    });

    test('should suggest compare_positions for position comparison', async () => {
      const args = {
        script: 'document.querySelector("#a").getBoundingClientRect().top === document.querySelector("#b").getBoundingClientRect().top'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      expect(fullResponse).toContain('💡 Consider using specialized tools instead');
      expect(fullResponse).toContain('compare_positions');
    });

    test('should suggest scroll tools for scrolling operations', async () => {
      const args = {
        script: 'window.scrollTo(0, 500); document.querySelector("#el").scrollIntoView();'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      expect(fullResponse).toContain('💡 Consider using specialized tools instead');
      expect(fullResponse).toContain('scroll_to_element');
      expect(fullResponse).toContain('scroll_by');
    });

    test('should NOT suggest tools for legitimate custom logic', async () => {
      const args = {
        script: 'myCustomFunction(); return mySpecialCalculation();'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      // Should not contain suggestions for custom logic
      expect(fullResponse).not.toContain('💡 Consider using specialized tools instead');
    });

    test('should provide multiple suggestions when script matches multiple patterns', async () => {
      const args = {
        script: 'document.querySelector("#test").getBoundingClientRect(); window.getComputedStyle(el);'
      };

      const result = await evaluateTool.execute(args, mockContext);
      const fullResponse = result.content.map(c => c.text).join('\n');

      expect(result.isError).toBe(false);
      expect(fullResponse).toContain('💡 Consider using specialized tools instead');
      expect(fullResponse).toContain('inspect_dom');
      expect(fullResponse).toContain('measure_element');
      expect(fullResponse).toContain('get_computed_styles');
    });
  });
});

describe('NavigateTool', () => {
  let navigationTool: NavigateTool;

  beforeEach(() => {
    jest.clearAllMocks();
    navigationTool = new NavigateTool(mockServer);
    // Reset browser and page mocks
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
  });

  test('should navigate to a URL', async () => {
    const args = {
      url: 'https://example.com',
      waitUntil: 'networkidle'
    };

    const result = await navigationTool.execute(args, mockContext);

    expect(mockGoto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'networkidle', timeout: 30000 });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Navigated to');
  });

  test('should handle navigation errors', async () => {
    const args = {
      url: 'https://example.com'
    };

    // Mock a navigation error
    mockGoto.mockImplementationOnce(() => Promise.reject(new Error('Navigation failed')));

    const result = await navigationTool.execute(args, mockContext);

    expect(mockGoto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'load', timeout: 30000 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Operation failed');
  });

  test('should handle missing page', async () => {
    const args = {
      url: 'https://example.com'
    };

    // Create context with no page but with browser
    const contextWithoutPage = { 
      server: mockServer,
      browser: mockBrowser
    } as unknown as ToolContext;

    const result = await navigationTool.execute(args, contextWithoutPage);

    expect(mockGoto).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Page is not available');
  });
  
  test('should handle disconnected browser', async () => {
    const args = {
      url: 'https://example.com'
    };
    
    // Mock disconnected browser
    mockIsConnected.mockReturnValueOnce(false);
    
    const result = await navigationTool.execute(args, mockContext);
    
    expect(mockGoto).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser is not connected');
  });
  
  test('should handle closed page', async () => {
    const args = {
      url: 'https://example.com'
    };
    
    // Mock closed page
    mockIsClosed.mockReturnValueOnce(true);
    
    const result = await navigationTool.execute(args, mockContext);
    
    expect(mockGoto).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Page is not available or has been closed');
  });
});
