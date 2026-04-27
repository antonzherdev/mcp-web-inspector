import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, ANNOTATIONS, createSuccessResponse } from '../../common/types.js';

const FILLABLE_BASE_SELECTOR =
  'input:not([type="button"]):not([type="submit"]):not([type="reset"])' +
  ':not([type="checkbox"]):not([type="radio"]):not([type="file"])' +
  ':not([type="image"]):not([type="hidden"]),' +
  'textarea,' +
  '[contenteditable=""],' +
  '[contenteditable="true"]';

const MAX_DESCENT_DEPTH = 4;

export const BOUNDED_FILLABLE_DESCENDANT_SELECTOR = (() => {
  const parts = FILLABLE_BASE_SELECTOR.split(',').map((s) => s.trim());
  const groups: string[] = [];
  for (let depth = 1; depth <= MAX_DESCENT_DEPTH; depth++) {
    const ancestors = '* > '.repeat(depth - 1);
    for (const p of parts) {
      groups.push(`:scope > ${ancestors}${p}`);
    }
  }
  return groups.join(', ');
})();

export class FillTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "fill",
      description: "fill an input/textarea/contenteditable; if the selector matches a wrapper, descends up to 4 levels to a unique fillable descendant (errors if zero or multiple)",
      annotations: ANNOTATIONS.interaction,
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for input field or its wrapper" },
          value: { type: "string", description: "Value to fill" },
        },
        required: ["selector", "value"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const normalizedSelector = this.normalizeSelector(args.selector);

      const locator = page.locator(normalizedSelector);
      const { element } = await this.selectPreferredLocator(locator, {
        errorOnMultiple: true,
        originalSelector: args.selector,
      });

      const wrapperInfo = await element.evaluate((el: any) => {
        const fillableMatch = (node: any): boolean => {
          if (!node || node.nodeType !== 1) return false;
          const tag = (node.tagName || '').toLowerCase();
          if (tag === 'textarea') return true;
          if (tag === 'input') {
            const type = (node.getAttribute('type') || '').toLowerCase();
            return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'hidden'].includes(type);
          }
          const ce = node.getAttribute('contenteditable');
          return ce === '' || ce === 'true';
        };
        return {
          isFillable: fillableMatch(el),
          tag: (el.tagName || '').toLowerCase(),
        };
      });

      if (wrapperInfo.isFillable) {
        await element.fill(args.value);
        return createSuccessResponse(`Filled ${args.selector} with: ${args.value}`);
      }

      const descendants = element.locator(BOUNDED_FILLABLE_DESCENDANT_SELECTOR);
      const count = await descendants.count();

      if (count === 0) {
        throw new Error(
          `Selector "${args.selector}" matched a <${wrapperInfo.tag}> wrapper with no fillable descendants within ${MAX_DESCENT_DEPTH} levels (input, textarea, contenteditable).`,
        );
      }

      if (count > 1) {
        const candidates = await describeFillableCandidates(descendants, count);
        throw new Error(
          `Selector "${args.selector}" matched a <${wrapperInfo.tag}> wrapper with ${count} fillable descendants. ` +
          `Use a more specific selector or add data-testid to the input itself.\n\nCandidates:\n${candidates}`,
        );
      }

      const target = descendants.first();
      const targetTag = await target.evaluate((el: any) => {
        const tag = (el.tagName || '').toLowerCase();
        const type = el.getAttribute?.('type');
        return type ? `<${tag} type="${type}">` : `<${tag}>`;
      });

      await target.fill(args.value);
      return createSuccessResponse(
        `Filled ${args.selector} with: ${args.value} (descended into ${targetTag})`,
      );
    });
  }
}

async function describeFillableCandidates(locator: any, count: number): Promise<string> {
  const max = Math.min(count, 5);
  const lines: string[] = [];
  for (let i = 0; i < max; i++) {
    const nth = locator.nth(i);
    try {
      const info = await nth.evaluate((el: any) => {
        const tag = (el.tagName || '').toLowerCase();
        const type = el.getAttribute?.('type') || null;
        const name = el.getAttribute?.('name') || null;
        const id = el.id || null;
        const placeholder = el.getAttribute?.('placeholder') || null;
        const ariaLabel = el.getAttribute?.('aria-label') || null;
        const testid = el.getAttribute?.('data-testid') || el.getAttribute?.('data-test') || el.getAttribute?.('data-cy') || null;
        return { tag, type, name, id, placeholder, ariaLabel, testid };
      });
      const attrs: string[] = [];
      if (info.type) attrs.push(`type="${info.type}"`);
      if (info.name) attrs.push(`name="${info.name}"`);
      if (info.id) attrs.push(`id="${info.id}"`);
      if (info.placeholder) attrs.push(`placeholder="${truncate(info.placeholder)}"`);
      if (info.ariaLabel) attrs.push(`aria-label="${truncate(info.ariaLabel)}"`);
      if (info.testid) attrs.push(`data-testid="${info.testid}"`);
      const head = `[${i}] <${info.tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
      const suggestion = info.testid ? `testid:${info.testid}` : info.id ? `id=${info.id}` : null;
      lines.push(suggestion ? `${head}\n    selector: ${suggestion}` : head);
    } catch {
      lines.push(`[${i}] (element)`);
    }
  }
  if (count > max) {
    lines.push(`… and ${count - max} more.`);
  }
  return lines.join('\n');
}

function truncate(s: string): string {
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}
