import { ToolHandler, ToolMetadata, SessionConfig } from '../../common/types.js';
import { BrowserToolBase } from '../base.js';
import type { ToolContext, ToolResponse } from '../../common/types.js';

export interface ElementExistsArgs {
  selector: string;
}

export class ElementExistsTool extends BrowserToolBase implements ToolHandler {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "element_exists",
      description: "Quick check if an element exists on the page. Ultra-lightweight alternative to query_selector_all when you only need existence confirmation. Returns simple exists/not found status. Most common check before attempting interaction. Supports testid shortcuts.",
      outputs: [
        "Returns one line:",
        "- ✓ exists: <tag id/class> (N matches) when found (N optional)",
        "- ✗ not found: <original selector> when none",
      ],
      examples: [
        "element_exists({ selector: 'testid:submit' })",
        "element_exists({ selector: '#does-not-exist' })",
      ],
      exampleOutputs: [
        { call: "element_exists({ selector: 'testid:submit' })", output: `✓ exists: <button data-testid=\"submit\">` },
        { call: "element_exists({ selector: '.card' })", output: `✓ exists: <div .card> (3 matches)` },
        { call: "element_exists({ selector: '#does-not-exist' })", output: `✗ not found: #does-not-exist` },
      ],
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand (e.g., 'testid:submit-button', '#main')"
          }
        },
        required: ["selector"],
      },
    };
  }

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
