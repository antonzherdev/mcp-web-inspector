import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';
import { gatherConsoleErrorsSince, quickNetworkIdleNote } from '../common/postAction.js';

type Direction = 'back' | 'forward';

/**
 * Tool for navigating browser history (back/forward)
 */
export class GoHistoryTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: 'go_history',
      description: "Navigate browser history (back/forward). Returns: 'Navigated <direction> in browser history', a quick network-idle note if available, 'URL: <current>', and 'Title: <current>' when set. If console errors occur after the navigation, returns an error like 'Console error after history navigation: <message>' including Title when available.",
      inputSchema: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            description: "History direction to navigate",
            enum: ['back', 'forward']
          },
        },
        required: ['direction'],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordNavigation();
    return this.safeExecute(context, async (page) => {
      const dir: Direction = args.direction === 'forward' ? 'forward' : 'back';

      // Capture initial state
      let initialUrl = '';
      let initialTitle = '';
      try { initialUrl = page.url(); } catch {}
      try { initialTitle = await page.title(); } catch {}

      // Perform history navigation
      if (dir === 'back') {
        await page.goBack();
      } else {
        await page.goForward();
      }

      const verb = dir === 'back' ? 'back' : 'forward';
      const lines: string[] = [`Navigated ${verb} in browser history`];

      // Allow network to settle briefly first (best-effort)
      try {
        const note = await quickNetworkIdleNote(page);
        if (note) lines.push(note);
      } catch {}

      // After the brief wait, surface console errors since navigation
      try {
        const errs = await gatherConsoleErrorsSince('navigation');
        if (errs.length > 0) {
          let titleInfo = '';
          try {
            const t = await page.title();
            if (t) titleInfo = `\nTitle: ${t}`;
          } catch {}
          return createErrorResponse(`Console error after history navigation: ${errs[0]}${titleInfo}`);
        }
      } catch {}

      // Report new URL and Title explicitly
      try {
        const newUrl = page.url();
        lines.push(`URL: ${newUrl}`);
      } catch {}
      try {
        const newTitle = await page.title();
        if (newTitle) lines.push(`Title: ${newTitle}`);
      } catch {}

      return createSuccessResponse(lines);
    });
  }
}
