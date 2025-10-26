import { DragTool, PressKeyTool } from '../../../tools/browser/interaction.js';
import { ToolContext } from '../../../tools/common/types.js';
import { Page, Browser } from 'playwright';
import { jest } from '@jest/globals';

// Mock page functions
const mockMouseMove = jest.fn().mockImplementation(() => Promise.resolve());
const mockMouseDown = jest.fn().mockImplementation(() => Promise.resolve());
const mockMouseUp = jest.fn().mockImplementation(() => Promise.resolve());
const mockKeyboardPress = jest.fn().mockImplementation(() => Promise.resolve());
const mockIsClosed = jest.fn().mockReturnValue(false);
const mockPageLocator = jest.fn();

// Mock mouse
const mockMouse = {
  move: mockMouseMove,
  down: mockMouseDown,
  up: mockMouseUp,
};

// Mock keyboard
const mockKeyboard = {
  press: mockKeyboardPress,
};

// Mock the Page object with proper typing
const mockPage = {
  mouse: mockMouse,
  keyboard: mockKeyboard,
  locator: mockPageLocator,
  isClosed: mockIsClosed,
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

describe('Advanced Browser Interaction Tools', () => {
  let dragTool: DragTool;
  let pressKeyTool: PressKeyTool;

  beforeEach(() => {
    jest.clearAllMocks();
    dragTool = new DragTool(mockServer);
    pressKeyTool = new PressKeyTool(mockServer);
    // Reset browser and page mocks
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
    mockMouseMove.mockImplementation(() => Promise.resolve());
    mockMouseDown.mockImplementation(() => Promise.resolve());
    mockMouseUp.mockImplementation(() => Promise.resolve());
    mockKeyboardPress.mockImplementation(() => Promise.resolve());
    mockPageLocator.mockReset();
  });

  describe('DragTool', () => {
    test('should drag an element to a target location', async () => {
      const args = {
        sourceSelector: '#source-element',
        targetSelector: '#target-element'
      };

      const sourceElement = {
        boundingBox: jest.fn(async () => ({ x: 10, y: 10, width: 100, height: 50 })),
      };
      const targetElement = {
        boundingBox: jest.fn(async () => ({ x: 10, y: 10, width: 100, height: 50 })),
      };
      const selectSpy = jest
        .spyOn(dragTool as any, 'selectPreferredLocator')
        .mockResolvedValueOnce({ element: sourceElement, elementIndex: 0, totalCount: 1 })
        .mockResolvedValueOnce({ element: targetElement, elementIndex: 0, totalCount: 1 });
      mockPageLocator.mockImplementation(() => ({}));

      const result = await dragTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenNthCalledWith(1, '#source-element');
      expect(mockPageLocator).toHaveBeenNthCalledWith(2, '#target-element');
      expect(sourceElement.boundingBox).toHaveBeenCalled();
      expect(targetElement.boundingBox).toHaveBeenCalled();
      expect(mockMouseMove).toHaveBeenCalledWith(60, 35); // Source center (10+100/2, 10+50/2)
      expect(mockMouseDown).toHaveBeenCalled();
      expect(mockMouseMove).toHaveBeenCalledWith(60, 35); // Target center (same mock values)
      expect(mockMouseUp).toHaveBeenCalled();
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Dragged element from');
      selectSpy.mockRestore();
    });

    test('should handle errors when element positions cannot be determined', async () => {
      const args = {
        sourceSelector: '#source-element',
        targetSelector: '#target-element'
      };

      const sourceElement = {
        boundingBox: jest.fn(async () => null),
      };
      const targetElement = {
        boundingBox: jest.fn(async () => ({ x: 10, y: 10, width: 100, height: 50 })),
      };
      const selectSpy = jest
        .spyOn(dragTool as any, 'selectPreferredLocator')
        .mockResolvedValueOnce({ element: sourceElement, elementIndex: 0, totalCount: 1 })
        .mockResolvedValueOnce({ element: targetElement, elementIndex: 0, totalCount: 1 });
      mockPageLocator.mockImplementation(() => ({}));

      const result = await dragTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenNthCalledWith(1, '#source-element');
      expect(sourceElement.boundingBox).toHaveBeenCalled();
      expect(mockMouseMove).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Could not get element positions');
      selectSpy.mockRestore();
    });

    test('should handle drag errors', async () => {
      const args = {
        sourceSelector: '#source-element',
        targetSelector: '#target-element'
      };

      // Mock a mouse operation error
      mockMouseDown.mockImplementationOnce(() => Promise.reject(new Error('Mouse operation failed')));

      const sourceElement = {
        boundingBox: jest.fn(async () => ({ x: 10, y: 10, width: 100, height: 50 })),
      };
      const targetElement = {
        boundingBox: jest.fn(async () => ({ x: 10, y: 10, width: 100, height: 50 })),
      };
      const selectSpy = jest
        .spyOn(dragTool as any, 'selectPreferredLocator')
        .mockResolvedValueOnce({ element: sourceElement, elementIndex: 0, totalCount: 1 })
        .mockResolvedValueOnce({ element: targetElement, elementIndex: 0, totalCount: 1 });
      mockPageLocator.mockImplementation(() => ({}));

      const result = await dragTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenNthCalledWith(1, '#source-element');
      expect(mockPageLocator).toHaveBeenNthCalledWith(2, '#target-element');
      expect(sourceElement.boundingBox).toHaveBeenCalled();
      expect(targetElement.boundingBox).toHaveBeenCalled();
      expect(mockMouseMove).toHaveBeenCalled();
      expect(mockMouseDown).toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Operation failed');
      selectSpy.mockRestore();
    });

    test('should handle missing page', async () => {
      const args = {
        sourceSelector: '#source-element',
        targetSelector: '#target-element'
      };

      const result = await dragTool.execute(args, { server: mockServer } as ToolContext);

      expect(mockPageLocator).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Browser page not initialized');
    });
  });

  describe('PressKeyTool', () => {
    test('should press a keyboard key', async () => {
      const args = {
        key: 'Enter'
      };

      const result = await pressKeyTool.execute(args, mockContext);

      expect(mockKeyboardPress).toHaveBeenCalledWith('Enter');
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Pressed key: Enter');
    });

    test('should focus an element before pressing a key if selector provided', async () => {
      const args = {
        key: 'Enter',
        selector: '#input-field'
      };

      const mockElement = {
        focus: jest.fn(async () => {}),
      };
      const selectSpy = jest
        .spyOn(pressKeyTool as any, 'selectPreferredLocator')
        .mockResolvedValue({ element: mockElement, elementIndex: 0, totalCount: 1 });
      mockPageLocator.mockImplementation(() => ({}));

      const result = await pressKeyTool.execute(args, mockContext);

      expect(mockPageLocator).toHaveBeenCalledWith('#input-field');
      expect(mockElement.focus).toHaveBeenCalled();
      expect(mockKeyboardPress).toHaveBeenCalledWith('Enter');
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Pressed key: Enter');
      selectSpy.mockRestore();
    });

    test('should handle key press errors', async () => {
      const args = {
        key: 'Enter'
      };

      // Mock a keyboard operation error
      mockKeyboardPress.mockImplementationOnce(() => Promise.reject(new Error('Keyboard operation failed')));

      const result = await pressKeyTool.execute(args, mockContext);

      expect(mockKeyboardPress).toHaveBeenCalledWith('Enter');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Operation failed');
    });

    test('should handle missing page', async () => {
      const args = {
        key: 'Enter'
      };

      const result = await pressKeyTool.execute(args, { server: mockServer } as ToolContext);

      expect(mockKeyboardPress).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Browser page not initialized');
    });
  });
}); 
