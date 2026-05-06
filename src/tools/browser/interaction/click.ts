import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, ANNOTATIONS, createSuccessResponse, createErrorResponse } from '../../common/types.js';
import { gatherConsoleErrorsSince, quickNetworkIdleNote, titleUrlChangeLines, snapshotOpenOverlays, overlayChangeLines, OverlaySnapshot } from '../common/postAction.js';

// Playwright actionability checks normally retry until the call timeout. We
// shorten the click timeout so a stuck click (overlay capturing pointer
// events, etc.) surfaces in seconds instead of burning 30s of agent time.
const CLICK_TIMEOUT_MS = 5000;

// Match only true pointer-event interception. "element is not stable" is a
// different actionability failure (animation / scroll) and would produce a
// misleading "intercepted by …" message — exclude it.
const INTERCEPTION_PATTERNS = [
  'intercepts pointer events',
  'subtree intercepts pointer events',
];

/**
 * Tool for clicking elements on the page
 */
export class ClickTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "click",
      description: "Click an element on the page",
      annotations: ANNOTATIONS.interaction,
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for the element to click. Supports 'testid:NAME' and 'dialog::SELECTOR' (scopes the lookup to the topmost open dialog/sheet, e.g. 'dialog::testid:confirm')." },
        },
        required: ["selector"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      // Use standard element selection with error on multiple matches.
      // createScopedLocator handles testid:/dialog::/etc. shortcuts.
      const locator = await this.createScopedLocator(page, args.selector);
      const { element } = await this.selectPreferredLocator(locator, {
        errorOnMultiple: true,
        originalSelector: args.selector,
      });

      // Capture initial state for change detection
      let initialUrl = '';
      let initialTitle = '';
      try { initialUrl = page.url(); } catch {}
      try { initialTitle = await page.title(); } catch {}
      const overlaysBefore = await snapshotOpenOverlays(page);

      try {
        await element.click({ timeout: CLICK_TIMEOUT_MS });
      } catch (clickError) {
        const message = (clickError as Error).message || '';
        const interceptedHit = INTERCEPTION_PATTERNS.find(p => message.includes(p));
        if (interceptedHit) {
          const diag = await diagnoseClickInterception(element).catch(() => null);
          return createErrorResponse(formatInterceptionError(args.selector, diag, overlaysBefore));
        }
        throw clickError;
      }

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

      // Overlays opened/closed as a result of the click — dialogs, menus,
      // listboxes, tooltips. Surface them so the agent doesn't have to
      // re-inspect to learn a sheet, dropdown, or tooltip just appeared.
      try {
        const overlaysAfter = await snapshotOpenOverlays(page);
        const ovLines = overlayChangeLines(overlaysBefore, overlaysAfter);
        if (ovLines.length > 0) lines.push(...ovLines);
      } catch {}

      return createSuccessResponse(lines);
    });
  }
}

interface InterceptionDiagnostic {
  point: { x: number; y: number } | null;
  interceptor: string | null;
  interceptorSelector: string | null;
  // Descriptor of the closest open dialog ancestor of the interceptor, or
  // null if the interceptor is NOT inside any modal. Used to decide whether
  // the "dismiss the modal first" remediation actually applies — the prior
  // behaviour fired for any open modal, even unrelated ones.
  blockingDialog: string | null;
}

async function diagnoseClickInterception(element: any): Promise<InterceptionDiagnostic> {
  return await element.evaluate((target: Element): InterceptionDiagnostic => {
    const rect = (target as HTMLElement).getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { point: null, interceptor: null, interceptorSelector: null, blockingDialog: null };
    }
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const top = document.elementFromPoint(x, y) as Element | null;
    if (!top || top === target || target.contains(top)) {
      return { point: { x, y }, interceptor: null, interceptorSelector: null, blockingDialog: null };
    }

    const tag = top.tagName.toLowerCase();
    const testid =
      top.getAttribute('data-testid') ||
      top.getAttribute('data-test') ||
      top.getAttribute('data-cy');
    const id = (top as HTMLElement).id || null;
    const aria = top.getAttribute('aria-label');
    const cls = (top as HTMLElement).className && typeof (top as HTMLElement).className === 'string'
      ? (top as HTMLElement).className.trim().split(/\s+/)[0]
      : null;

    const descParts = [`<${tag}`];
    if (testid) descParts.push(`data-testid="${testid}"`);
    else if (id) descParts.push(`id="${id}"`);
    else if (aria) descParts.push(`aria-label="${aria}"`);
    else if (cls) descParts.push(`class="${cls}"`);
    descParts[descParts.length - 1] += '>';
    const interceptor = descParts.join(' ');

    let suggestion: string | null = null;
    if (testid) suggestion = `testid:${testid}`;
    else if (id) suggestion = `#${id}`;
    else if (aria) suggestion = `[aria-label="${aria}"]`;
    else if (cls) suggestion = `${tag}.${cls}`;
    else suggestion = tag;

    // Decide whether the interceptor is "blocking on behalf of an open
    // modal" — i.e. dismissing the modal is the right fix.
    //
    // Real modal structures (Mantine, Radix, MUI, Headless UI) wrap both
    // the backdrop AND the dialog content inside a dedicated modal-root
    // container. So we accept either:
    //   (a) the interceptor is INSIDE an open dialog, OR
    //   (b) the interceptor SHARES A NON-BODY ANCESTOR with an open dialog
    //       (the modal-root pattern — interceptor is the backdrop sibling).
    //
    // We deliberately stop before <body> to avoid matching unrelated
    // body-level modals (e.g. a cookie banner intercepting while an
    // unrelated notifications panel is open elsewhere on the page).
    const isOpenDialogElement = (el: Element): boolean => {
      const role = el.getAttribute && el.getAttribute('role');
      if (role === 'dialog' || role === 'alertdialog') {
        return el.getAttribute('aria-hidden') !== 'true';
      }
      if (el.tagName.toLowerCase() === 'dialog' && (el as HTMLDialogElement).hasAttribute('open')) {
        return true;
      }
      return false;
    };

    const describeDialog = (d: Element): string => {
      const dTag = d.tagName.toLowerCase();
      const dRole = d.getAttribute('role') || (dTag === 'dialog' ? 'dialog' : '');
      const dTestid = d.getAttribute('data-testid') || d.getAttribute('data-test') || d.getAttribute('data-cy');
      const dId = (d as HTMLElement).id || null;
      const dAria = d.getAttribute('aria-label');
      const parts = [`<${dTag}`];
      if (dRole) parts.push(`role="${dRole}"`);
      if (dTestid) parts.push(`data-testid="${dTestid}"`);
      else if (dId) parts.push(`id="${dId}"`);
      if (dAria) parts.push(`aria-label="${dAria}"`);
      parts[parts.length - 1] += '>';
      return parts.join(' ');
    };

    const DIALOG_CHILD_SELECTOR =
      '[role="dialog"]:not([aria-hidden="true"]),' +
      '[role="alertdialog"]:not([aria-hidden="true"]),' +
      'dialog[open]';

    let blockingDialog: string | null = null;
    let cur: Element | null = top;
    while (cur && cur !== document.body) {
      // (a) interceptor itself is, or is inside, an open dialog
      if (isOpenDialogElement(cur)) {
        blockingDialog = describeDialog(cur);
        break;
      }
      // (b) cur is a modal-root that wraps both the interceptor and an
      //     open dialog (the backdrop-sibling pattern).
      const sibling = cur.querySelector(DIALOG_CHILD_SELECTOR);
      if (sibling && sibling !== top && !top.contains(sibling) && !sibling.contains(top)) {
        blockingDialog = describeDialog(sibling);
        break;
      }
      cur = cur.parentElement;
    }

    return {
      point: { x, y },
      interceptor,
      interceptorSelector: suggestion,
      blockingDialog,
    };
  });
}

function formatInterceptionError(
  selector: string,
  diag: InterceptionDiagnostic | null,
  _overlays: OverlaySnapshot,
): string {
  const lines: string[] = ['Click failed: pointer events intercepted by an element above the target.'];
  lines.push(`Target: ${selector}`);
  if (diag?.point) {
    lines.push(`Click point: (${Math.round(diag.point.x)}, ${Math.round(diag.point.y)})`);
  }
  if (diag?.interceptor) {
    lines.push(`Intercepted by: ${diag.interceptor}`);
    if (diag.interceptorSelector) {
      lines.push(`  selector: ${diag.interceptorSelector}`);
    }
  }

  // Only suggest "dismiss the modal first" when the intercepting element
  // is actually inside an open dialog. A benign modal that happens to be
  // open while a cookie banner / toast intercepts shouldn't get this hint.
  if (diag?.blockingDialog) {
    lines.push('');
    lines.push(`The interceptor is inside an open modal: ${diag.blockingDialog}.`);
    lines.push("  Most likely fix: dismiss it first (press_key with key=\"Escape\", or click its close button).");
  }

  lines.push('');
  lines.push('Options:');
  lines.push('  1) Click the intercepting element first if it is a dismissible overlay (modal/toast/cookie banner).');
  lines.push('  2) navigate() directly if the target has a stable URL.');
  lines.push('  3) Use evaluate() to dispatch a programmatic click if a real user click would also be blocked.');
  return lines.join('\n');
}
