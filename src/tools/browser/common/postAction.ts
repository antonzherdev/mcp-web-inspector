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

