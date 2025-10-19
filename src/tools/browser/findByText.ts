import { ToolHandler } from '../common/types.js';
import { BrowserToolBase } from './base.js';
import type { ToolContext, ToolResponse } from '../common/types.js';

export interface FindByTextArgs {
  text: string;
  exact?: boolean;
  caseSensitive?: boolean;
  limit?: number;
}

export class FindByTextTool extends BrowserToolBase implements ToolHandler {
  async execute(args: FindByTextArgs, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const { text, exact = false, caseSensitive = false, limit = 10 } = args;

      // Build the text selector based on exact and caseSensitive options
      let selector: string;
      if (exact) {
        selector = `text="${text}"`;
      } else {
        // Use regex for partial match with case sensitivity
        const flags = caseSensitive ? '' : 'i';
        const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        selector = `text=/${escapedText}/${flags}`;
      }

      // Find all matching elements
      const locator = page.locator(selector);
      const count = await locator.count();

      if (count === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `✗ No elements found containing "${text}"`
            }
          ],
          isError: false
        };
      }

      // Limit results
      const elementsToShow = Math.min(count, limit);
      const elements: string[] = [];

      for (let i = 0; i < elementsToShow; i++) {
        const element = locator.nth(i);

        // Get element info
        const [tagName, boundingBox, textContent, isVisible, isEnabled] = await Promise.all([
          element.evaluate((el) => el.tagName.toLowerCase()),
          element.boundingBox().catch(() => null),
          element.textContent().catch(() => ''),
          element.isVisible().catch(() => false),
          element.isEnabled().catch(() => true)
        ]);

        // Get selector attributes for better identification
        const selectorInfo = await element.evaluate((el) => {
          const attrs: Record<string, string> = {};
          if (el.id) attrs.id = el.id;
          if (el.className && typeof el.className === 'string') {
            attrs.class = el.className.split(' ').slice(0, 2).join(' ');
          }
          const testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-cy');
          if (testId) attrs.testid = testId;
          if (el.getAttribute('href')) attrs.href = el.getAttribute('href') || '';
          if (el.getAttribute('name')) attrs.name = el.getAttribute('name') || '';
          if (el.getAttribute('type')) attrs.type = el.getAttribute('type') || '';
          if (el.getAttribute('aria-label')) attrs['aria-label'] = el.getAttribute('aria-label') || '';
          return attrs;
        });

        // Build selector string
        let selectorStr = `<${tagName}`;
        if (selectorInfo.id) selectorStr += `#${selectorInfo.id}`;
        if (selectorInfo.class) selectorStr += ` class="${selectorInfo.class}"`;
        if (selectorInfo.testid) selectorStr += ` data-testid="${selectorInfo.testid}"`;
        if (selectorInfo.name) selectorStr += ` name="${selectorInfo.name}"`;
        if (selectorInfo.type) selectorStr += ` type="${selectorInfo.type}"`;
        if (selectorInfo.href) selectorStr += ` href="${selectorInfo.href.slice(0, 30)}${selectorInfo.href.length > 30 ? '...' : ''}"`;
        if (selectorInfo['aria-label']) selectorStr += ` aria-label="${selectorInfo['aria-label']}"`;
        selectorStr += '>';

        // Format position
        let positionStr = '';
        if (boundingBox) {
          const x = Math.round(boundingBox.x);
          const y = Math.round(boundingBox.y);
          const w = Math.round(boundingBox.width);
          const h = Math.round(boundingBox.height);
          positionStr = `    @ (${x},${y}) ${w}x${h}px`;
        } else {
          positionStr = `    @ (no bounding box)`;
        }

        // Format text content (truncate if too long)
        const truncatedText = textContent && textContent.length > 100
          ? textContent.slice(0, 100) + '...'
          : textContent;
        const textStr = `    "${truncatedText}"`;

        // Format state
        let stateStr = '    ';
        if (isVisible) {
          stateStr += '✓ visible';
        } else {
          stateStr += '✗ hidden';
          // Try to detect why it's hidden
          const hiddenReason = await element.evaluate((el) => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none') return '(display: none)';
            if (style.visibility === 'hidden') return '(visibility: hidden)';
            if (style.opacity === '0') return '(opacity: 0)';
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return '(zero size)';
            return '';
          }).catch(() => '');
          if (hiddenReason) stateStr += ` ${hiddenReason}`;
        }

        // Check if interactive
        const isInteractive = await element.evaluate((el) => {
          const tag = el.tagName.toLowerCase();
          if (['a', 'button', 'input', 'select', 'textarea'].includes(tag)) return true;
          if (el.getAttribute('onclick')) return true;
          if (el.getAttribute('role') === 'button') return true;
          return false;
        }).catch(() => false);

        if (isVisible && isInteractive && isEnabled) {
          stateStr += ', ⚡ interactive';
        } else if (isVisible && isInteractive && !isEnabled) {
          stateStr += ', ✗ disabled';
        }

        elements.push(`[${i}] ${selectorStr}\n${positionStr}\n${textStr}\n${stateStr}`);
      }

      const header = count > limit
        ? `Found ${count} elements containing "${text}" (showing first ${limit}):\n`
        : `Found ${count} element${count > 1 ? 's' : ''} containing "${text}":\n`;

      return {
        content: [
          {
            type: 'text',
            text: header + '\n' + elements.join('\n\n')
          }
        ],
        isError: false
      };
    });
  }
}
