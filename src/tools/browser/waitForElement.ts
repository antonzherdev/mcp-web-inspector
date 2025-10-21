import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse } from '../common/types.js';

export interface WaitForElementArgs {
  selector: string;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
  timeout?: number;
}

export class WaitForElementTool extends BrowserToolBase {
  async execute(args: WaitForElementArgs, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const { selector, state = 'visible', timeout = 10000 } = args;

      const normalizedSelector = this.normalizeSelector(selector);
      const locator = page.locator(normalizedSelector);

      const startTime = Date.now();

      try {
        await locator.waitFor({ state, timeout });
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        // Check current state
        const isVisible = await locator.isVisible().catch(() => false);
        const count = await locator.count();
        const exists = count > 0;

        const statusLines = [
          `✓ Element ${state} after ${duration}s`,
          `Now: ${isVisible ? '✓ visible' : '✗ hidden'}, ${exists ? '✓ exists' : '✗ not found'}`
        ];

        return {
          content: [{ type: 'text', text: statusLines.join('\n') }],
          isError: false,
        };
      } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{
            type: 'text',
            text: `✗ Timeout after ${duration}s waiting for element to be ${state}\nError: ${errorMessage}`
          }],
          isError: true,
        };
      }
    });
  }
}
