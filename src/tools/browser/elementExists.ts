import { ToolHandler } from '../common/types.js';
import { BrowserToolBase } from './base.js';
import type { ToolContext, ToolResponse } from '../common/types.js';

export interface ElementExistsArgs {
  selector: string;
}

export class ElementExistsTool extends BrowserToolBase implements ToolHandler {
  async execute(args: ElementExistsArgs, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const normalizedSelector = this.normalizeSelector(args.selector);

      const locator = page.locator(normalizedSelector);
      const count = await locator.count();

      if (count === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `✗ not found: ${args.selector}`
            }
          ],
          isError: false
        };
      }

      // Get element info for better output
      const element = locator.first();
      const elementInfo = await element.evaluate((el) => {
        const tag = el.tagName.toLowerCase();
        const parts: string[] = [tag];

        if (el.id) parts.push(`#${el.id}`);

        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c).slice(0, 2);
          if (classes.length) {
            classes.forEach(c => parts.push(`.${c}`));
          }
        }

        return parts.join('');
      }).catch(() => args.selector);

      if (count === 1) {
        return {
          content: [
            {
              type: 'text',
              text: `✓ exists: <${elementInfo}>`
            }
          ],
          isError: false
        };
      }

      // Multiple matches
      return {
        content: [
          {
            type: 'text',
            text: `✓ exists: <${elementInfo}> (${count} matches)`
            }
          ],
        isError: false
        };
    });
  }
}
