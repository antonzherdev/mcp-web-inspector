import { WaitForElementTool } from '../../../tools/browser/waitForElement.js';
import type { ToolContext } from '../../../tools/common/types.js';
import type { Page } from 'playwright';

describe('WaitForElementTool', () => {
  let tool: WaitForElementTool;
  let mockPage: jest.Mocked<Page>;
  let mockLocator: any;
  let context: ToolContext;

  beforeEach(() => {
    // Create mock locator
    mockLocator = {
      waitFor: jest.fn().mockResolvedValue(undefined),
      isVisible: jest.fn().mockResolvedValue(true),
      count: jest.fn().mockResolvedValue(1),
    };

    // Create mock page
    mockPage = {
      locator: jest.fn().mockReturnValue(mockLocator),
      isClosed: jest.fn().mockReturnValue(false),
    } as any;

    context = {
      page: mockPage,
      server: {} as any,
    };

    tool = new WaitForElementTool({} as any);
  });

  describe('execute', () => {
    it('should wait for element to be visible (default state)', async () => {
      const result = await tool.execute(
        { selector: '#submit-button' },
        context
      );

      expect(mockPage.locator).toHaveBeenCalledWith('#submit-button');
      expect(mockLocator.waitFor).toHaveBeenCalledWith({
        state: 'visible',
        timeout: 10000,
      });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✓ Element visible after');
      expect(result.content[0].text).toContain('✓ visible');
      expect(result.content[0].text).toContain('✓ exists');
    });

    it('should wait for element to be hidden', async () => {
      mockLocator.isVisible.mockResolvedValue(false);

      const result = await tool.execute(
        { selector: '#loading-spinner', state: 'hidden' },
        context
      );

      expect(mockLocator.waitFor).toHaveBeenCalledWith({
        state: 'hidden',
        timeout: 10000,
      });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✓ Element hidden after');
      expect(result.content[0].text).toContain('✗ hidden');
    });

    it('should wait for element to be attached', async () => {
      const result = await tool.execute(
        { selector: 'testid:dynamic-content', state: 'attached' },
        context
      );

      expect(mockPage.locator).toHaveBeenCalledWith('[data-testid="dynamic-content"]');
      expect(mockLocator.waitFor).toHaveBeenCalledWith({
        state: 'attached',
        timeout: 10000,
      });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✓ Element attached after');
    });

    it('should wait for element to be detached', async () => {
      mockLocator.count.mockResolvedValue(0);

      const result = await tool.execute(
        { selector: '#modal', state: 'detached' },
        context
      );

      expect(mockLocator.waitFor).toHaveBeenCalledWith({
        state: 'detached',
        timeout: 10000,
      });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✓ Element detached after');
      expect(result.content[0].text).toContain('✗ not found');
    });

    it('should use custom timeout', async () => {
      const result = await tool.execute(
        { selector: '#slow-element', timeout: 30000 },
        context
      );

      expect(mockLocator.waitFor).toHaveBeenCalledWith({
        state: 'visible',
        timeout: 30000,
      });
      expect(result.isError).toBe(false);
    });

    it('should handle timeout error', async () => {
      const timeoutError = new Error('Timeout 5000ms exceeded');
      mockLocator.waitFor.mockRejectedValue(timeoutError);

      const result = await tool.execute(
        { selector: '#missing-element', timeout: 5000 },
        context
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('✗ Timeout after');
      expect(result.content[0].text).toContain('waiting for element to be visible');
      expect(result.content[0].text).toContain('Timeout 5000ms exceeded');
    });

    it('should normalize testid selector', async () => {
      const result = await tool.execute(
        { selector: 'testid:submit-btn' },
        context
      );

      expect(mockPage.locator).toHaveBeenCalledWith('[data-testid="submit-btn"]');
      expect(result.isError).toBe(false);
    });

    it('should show correct visibility status when element is hidden', async () => {
      mockLocator.isVisible.mockResolvedValue(false);
      mockLocator.count.mockResolvedValue(1);

      const result = await tool.execute(
        { selector: '#hidden-element', state: 'attached' },
        context
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✗ hidden');
      expect(result.content[0].text).toContain('✓ exists');
    });

    it('should handle element not found after successful wait', async () => {
      mockLocator.count.mockResolvedValue(0);
      mockLocator.isVisible.mockResolvedValue(false);

      const result = await tool.execute(
        { selector: '#detached-element', state: 'detached' },
        context
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✗ hidden');
      expect(result.content[0].text).toContain('✗ not found');
    });

    it('should show duration in output', async () => {
      // Mock a short delay
      mockLocator.waitFor.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const result = await tool.execute(
        { selector: '#element' },
        context
      );

      expect(result.isError).toBe(false);
      // Duration should be approximately 0.1s (could be 0.0-0.2 due to timing)
      expect(result.content[0].text).toMatch(/after \d+\.\d+s/);
    });

    it('should handle errors during visibility check gracefully', async () => {
      mockLocator.isVisible.mockRejectedValue(new Error('Element detached'));

      const result = await tool.execute(
        { selector: '#element' },
        context
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✗ hidden');
    });

    it('should support all state options', async () => {
      const states: Array<'visible' | 'hidden' | 'attached' | 'detached'> = [
        'visible',
        'hidden',
        'attached',
        'detached',
      ];

      for (const state of states) {
        mockLocator.waitFor.mockClear();

        await tool.execute(
          { selector: '#element', state },
          context
        );

        expect(mockLocator.waitFor).toHaveBeenCalledWith({
          state,
          timeout: 10000,
        });
      }
    });
  });
});
