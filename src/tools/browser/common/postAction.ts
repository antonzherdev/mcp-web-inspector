import type { Page } from 'playwright';

// Gather console error/exception logs since a baseline event
export async function gatherConsoleErrorsSince(since: 'navigation' | 'interaction'): Promise<string[]> {
  const { getConsoleLogsSinceLastNavigation, getConsoleLogsSinceLastInteraction } = await import('../../../toolHandler.js');
  const logs: string[] = since === 'navigation'
    ? getConsoleLogsSinceLastNavigation()
    : getConsoleLogsSinceLastInteraction();
  return logs.filter(l => l.startsWith('[error]') || l.startsWith('[exception]'));
}

// Provide a compact, best-effort network idle note
export async function quickNetworkIdleNote(page: Page): Promise<string> {
  try {
    const start = Date.now();
    const anyPage: any = page as any;
    const wait = anyPage?.waitForLoadState?.bind(page);
    if (typeof wait === 'function') {
      await wait('networkidle', { timeout: 500 });
      const ms = Date.now() - start;
      return `✓ Network idle after ${ms}ms, 0 pending requests`;
    }
  } catch {
    // fall through to no-activity note
  }
  return 'No new network activity detected (quick check)';
}

// Compute concise lines for title/URL when changed
export async function titleUrlChangeLines(page: Page, initial: { url?: string; title?: string } = {}): Promise<string[]> {
  const lines: string[] = [];
  let newUrl = '';
  let newTitle = '';
  try { newUrl = page.url(); } catch {}
  try { newTitle = await page.title(); } catch {}

  if (initial.url && newUrl && initial.url !== newUrl) {
    lines.push(`URL changed: ${newUrl}`);
  }
  if (initial.title && newTitle && initial.title !== newTitle) {
    lines.push(`Title changed: ${newTitle}`);
  }
  return lines;
}

export type OverlayKind = 'dialog' | 'menu' | 'listbox' | 'tooltip' | 'popup';

export interface OverlayEntry {
  descriptor: string;
  kind: OverlayKind;
  // Suggested selector prefix for scoped follow-up reads/clicks. Only set
  // for dialog kind today (the `dialog::` shortcut). Menus/listboxes are
  // typically interacted with by clicking their items directly.
  suggestion?: string;
}

export interface OverlaySnapshot {
  // Stable keys (one per visible overlay) so we can diff before/after an
  // action and report new vs. closed overlays, not just count changes.
  keys: string[];
  entries: Record<string, OverlayEntry>;
}

// Selector covering modal-style dialogs. Kept distinct from popup roots so
// the kind classifier and the dialog:: shortcut can coexist cleanly.
const DIALOG_ROOTS_SELECTOR =
  '[role="dialog"]:not([aria-hidden="true"]),' +
  '[role="alertdialog"]:not([aria-hidden="true"]),' +
  'dialog[open]';

// Selector covering popup-style overlays (menus, listboxes, tooltips,
// expanded combobox panels, Radix-style data-state="open" content). These
// surface in click output as "↑ Menu opened" etc. so the agent learns a
// transient panel appeared without having to re-inspect the page.
//
// Note on framework attributes:
// - `[data-state="open"]` is Radix; we restrict to known panel roles or
//   Radix's popper content wrapper to avoid false positives on triggers.
// - `[data-headlessui-state="open"]` is set by Headless UI on EVERY component
//   (panels AND triggers), so it must be qualified by a panel role too.
const POPUP_ROOTS_SELECTOR =
  '[role="menu"]:not([aria-hidden="true"]),' +
  '[role="listbox"]:not([aria-hidden="true"]),' +
  '[role="tooltip"]:not([aria-hidden="true"]),' +
  '[data-state="open"][role="menu"],' +
  '[data-state="open"][role="listbox"],' +
  '[data-state="open"][data-radix-popper-content-wrapper],' +
  '[data-headlessui-state="open"][role="menu"],' +
  '[data-headlessui-state="open"][role="listbox"]';

// Snapshot which overlays (dialogs + popups) are currently visible. The key
// encodes a stable fingerprint (role+testid/id/aria-label) so the same
// overlay identifies consistently before and after an action, even if the
// DOM list reorders. We avoid encoding DOM index when an identifying
// attribute is present, so a re-render at a new position doesn't read as
// "closed + opened" noise.
export async function snapshotOpenOverlays(page: Page): Promise<OverlaySnapshot> {
  try {
    return await page.evaluate(({ dialogSel, popupSel }): OverlaySnapshot => {
      const isUserVisible = (el: Element): boolean => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
          return false;
        }
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const classify = (el: Element): OverlayKind => {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || '';
        if (role === 'dialog' || role === 'alertdialog' || tag === 'dialog') return 'dialog';
        if (role === 'menu') return 'menu';
        if (role === 'listbox') return 'listbox';
        if (role === 'tooltip') return 'tooltip';
        return 'popup';
      };

      const describe = (el: Element, kind: OverlayKind): { descriptor: string; key: string; suggestion?: string } => {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || (tag === 'dialog' ? 'dialog' : '');
        const testid =
          el.getAttribute('data-testid') ||
          el.getAttribute('data-test') ||
          el.getAttribute('data-cy');
        const id = (el as HTMLElement).id || null;
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        let labelText: string | null = null;
        if (ariaLabelledBy) {
          const labelEl = document.getElementById(ariaLabelledBy);
          labelText = labelEl?.textContent?.trim() || null;
        }

        const parts = [`<${tag}`];
        if (role) parts.push(`role="${role}"`);
        if (testid) parts.push(`data-testid="${testid}"`);
        else if (id) parts.push(`id="${id}"`);
        if (ariaLabel) parts.push(`aria-label="${ariaLabel}"`);
        else if (labelText) parts.push(`labelled="${labelText.slice(0, 60)}"`);
        parts[parts.length - 1] += '>';
        const descriptor = parts.join(' ');

        // When an identifying attribute is present, the key is stable across
        // re-renders. Otherwise, fall back to a normalized text fingerprint:
        // digit runs replaced with `#` so that badge counts, timestamps, or
        // counters in menu items don't flip the key on every re-render.
        // Avoids the "closed + opened" false positive that a raw DOM index
        // (or raw text snippet) would produce.
        const stableTextFingerprint = (() => {
          const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
          return raw.replace(/\d+/g, '#').slice(0, 40);
        })();
        const fingerprint = testid || id || ariaLabel || labelText || stableTextFingerprint;
        const key = `${kind}|${role}|${fingerprint}`;

        const suggestion =
          kind === 'dialog' ? (testid ? `dialog::testid:${testid}` : 'dialog::') : undefined;

        return { descriptor, key, suggestion };
      };

      const result: OverlaySnapshot = { keys: [], entries: {} };
      const seen = new Set<Element>();

      const collect = (selector: string) => {
        Array.from(document.querySelectorAll(selector))
          .filter(isUserVisible)
          .forEach((el) => {
            if (seen.has(el)) return;
            seen.add(el);
            const kind = classify(el);
            const { descriptor, key, suggestion } = describe(el, kind);
            // Disambiguate truly-identical overlays by appending a counter.
            let uniqueKey = key;
            let n = 1;
            while (result.entries[uniqueKey]) {
              uniqueKey = `${key}#${++n}`;
            }
            result.keys.push(uniqueKey);
            result.entries[uniqueKey] = { descriptor, kind, suggestion };
          });
      };

      collect(dialogSel);
      collect(popupSel);
      return result;
    }, { dialogSel: DIALOG_ROOTS_SELECTOR, popupSel: POPUP_ROOTS_SELECTOR });
  } catch {
    return { keys: [], entries: {} };
  }
}

const KIND_LABEL: Record<OverlayKind, string> = {
  dialog: 'Dialog',
  menu: 'Menu',
  listbox: 'Listbox',
  tooltip: 'Tooltip',
  popup: 'Popup',
};

// Diff two snapshots and emit human-readable change lines. Used by click to
// surface "↑ Menu opened" / "↓ Dialog closed" etc. so the LLM doesn't have
// to re-inspect the page after every interaction.
export function overlayChangeLines(before: OverlaySnapshot, after: OverlaySnapshot): string[] {
  const beforeSet = new Set(before.keys);
  const afterSet = new Set(after.keys);

  const opened = after.keys.filter(k => !beforeSet.has(k));
  const closed = before.keys.filter(k => !afterSet.has(k));

  const lines: string[] = [];
  for (const k of opened) {
    const e = after.entries[k];
    if (!e) continue;
    lines.push(`↑ ${KIND_LABEL[e.kind]} opened: ${e.descriptor}`);
    if (e.suggestion) {
      lines.push(`  Tip: scope reads/clicks with '${e.suggestion}SELECTOR' (e.g. ${e.suggestion}button).`);
    }
  }
  for (const k of closed) {
    const e = before.entries[k];
    if (!e) continue;
    lines.push(`↓ ${KIND_LABEL[e.kind]} closed: ${e.descriptor}`);
  }
  return lines;
}

