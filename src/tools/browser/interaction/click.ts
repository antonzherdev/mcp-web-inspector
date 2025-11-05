import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';
import { gatherConsoleErrorsSince, quickNetworkIdleNote, titleUrlChangeLines } from '../common/postAction.js';

/**
 * Tool for clicking elements on the page
 */
export class ClickTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "click",
      description: "Click an element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for the element to click" },
        },
        required: ["selector"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const normalizedSelector = this.normalizeSelector(args.selector);

      // Use standard element selection with error on multiple matches
      const locator = page.locator(normalizedSelector);
      const { element } = await this.selectPreferredLocator(locator, {
        errorOnMultiple: true,
        originalSelector: args.selector,
      });

      // Capture initial state for change detection
      let initialUrl = '';
      let initialTitle = '';
      try { initialUrl = page.url(); } catch {}
      try { initialTitle = await page.title(); } catch {}

      await element.click();

      const lines: string[] = [`Clicked element: ${args.selector}`];

      // First, a quick network-idle hint to allow errors to flush
      try {
        const note = await quickNetworkIdleNote(page);
        if (note) lines.push(note);
      } catch {}

      // Then, surface console errors triggered by the interaction
      try {
        const errs = await gatherConsoleErrorsSince('interaction');
        if (errs.length > 0) {
          let titleInfo = '';
          try {
            const t = await page.title();
            if (t) titleInfo = `\nTitle: ${t}`;
          } catch {}
          return createErrorResponse(`Console error after click: ${errs[0]}${titleInfo}`);
        }
      } catch {
        // ignore log retrieval errors
      }

      // Title / URL changes
      try {
        const changeLines = await titleUrlChangeLines(page, { url: initialUrl, title: initialTitle });
        if (changeLines.length > 0) lines.push(...changeLines);
      } catch {}

      return createSuccessResponse(lines);
    });
  }
}
