/**
 * Integration tests covering:
 *  - The `dialog::` selector scope shortcut for getting text inside the
 *    topmost open dialog/sheet (round-2 improvement #2).
 *  - The click interception diagnostic that names the element on top of the
 *    target when pointer events are intercepted (round-2 improvement #1).
 */

import { handleToolCall } from '../../toolHandler.js';
import { jest } from '@jest/globals';
import { browserAvailable } from '../helpers/browserSetup.js';

const mockServer = { sendMessage: jest.fn() };

const d = browserAvailable ? describe : describe.skip;

function dataUrl(html: string): string {
  return `data:text/html;base64,${Buffer.from(html).toString('base64')}`;
}

d('dialog:: scope shortcut', () => {
  afterEach(async () => {
    await handleToolCall('close', {}, mockServer);
  });

  test('get_text with dialog::section reads inside topmost dialog, not page chrome', async () => {
    const html = `
      <!DOCTYPE html>
      <html><head><title>Dialog scope test</title></head>
      <body>
        <section>page chrome content</section>
        <div role="dialog" aria-modal="true">
          <section>dialog inner content</section>
        </div>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('get_text', { selector: 'dialog::section' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('dialog inner content');
    expect(text).not.toContain('page chrome content');
  }, 30000);

  test('get_text with bare dialog:: returns the topmost dialog itself', async () => {
    const html = `
      <!DOCTYPE html>
      <html><head><title>Bare dialog:: test</title></head>
      <body>
        <div role="dialog" aria-modal="true"><p>only sheet content</p></div>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('get_text', { selector: 'dialog::' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('only sheet content');
  }, 30000);

  test('selector without dialog:: prefix behaves unchanged', async () => {
    const html = `
      <!DOCTYPE html>
      <html><head><title>No prefix</title></head>
      <body><p id="x">hello world</p></body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('get_text', { selector: '#x' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('hello world');
  }, 30000);

  test('topmost dialog selected by max effective z-index, not DOM order', async () => {
    // Two dialogs are open. The "OLDER" dialog appears later in DOM order
    // but has a backdrop with z-index 5; the "ACTIVE" dialog appears earlier
    // in DOM but its backdrop has z-index 100. The active one is on top
    // visually and should win — DOM-order .last() would pick the wrong one.
    const html = `
      <!DOCTYPE html>
      <html><head><title>Z-index dialog test</title>
        <style>
          .backdrop { position: fixed; inset: 0; }
          .dialog { position: fixed; top: 100px; left: 100px; background: white; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="backdrop" style="z-index: 100;">
          <div class="dialog" role="dialog" aria-modal="true">
            <p>active dialog content</p>
          </div>
        </div>
        <div class="backdrop" style="z-index: 5;">
          <div class="dialog" role="dialog" aria-modal="true">
            <p>older dialog content</p>
          </div>
        </div>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('get_text', { selector: 'dialog::p' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('active dialog content');
    expect(text).not.toContain('older dialog content');
  }, 30000);
});

d('auto-scope to active modal', () => {
  afterEach(async () => {
    await handleToolCall('close', {}, mockServer);
  });

  test('get_text without selector auto-scopes to open modal', async () => {
    const html = `
      <!DOCTYPE html>
      <html><head><title>Auto-scope test</title></head>
      <body>
        <main><p>page chrome behind backdrop</p></main>
        <div role="dialog" aria-modal="true" aria-label="Settings">
          <p>modal foreground content</p>
        </div>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('get_text', {}, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('🪟 Auto-scoped to open modal');
    expect(text).toContain('aria-label="Settings"');
    expect(text).toContain('modal foreground content');
    expect(text).not.toContain('page chrome behind backdrop');
  }, 30000);

  test('explicit selector overrides auto-scope', async () => {
    const html = `
      <!DOCTYPE html>
      <html><head><title>Override test</title></head>
      <body>
        <main><p id="under">page text under modal</p></main>
        <div role="dialog" aria-modal="true"><p>modal text</p></div>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('get_text', { selector: '#under' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).not.toContain('Auto-scoped');
    expect(text).toContain('page text under modal');
  }, 30000);

  test('non-modal [role="dialog"] does NOT trigger auto-scope', async () => {
    // Side panels and similar use role="dialog" without aria-modal — they
    // don't dominate the page so auto-scope should leave them alone.
    const html = `
      <!DOCTYPE html>
      <html><head><title>Side panel test</title></head>
      <body>
        <main><p>main page text</p></main>
        <aside role="dialog"><p>side panel text</p></aside>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('get_text', {}, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).not.toContain('Auto-scoped');
    expect(text).toContain('main page text');
  }, 30000);

  test('Mantine-style modal is correctly identified and auto-scoped', async () => {
    // Real-world example: Mantine Modal markup. The dialog is a deeply
    // nested <section role="dialog" aria-modal="true">, with its z-index
    // coming from a `mantine-Modal-root.z-100` ancestor. The overlay is a
    // sibling of the dialog content within that root.
    const html = `
      <!DOCTYPE html>
      <html><head><title>Mantine modal</title>
        <style>
          .z-100 { z-index: 100; position: relative; }
          .mantine-Modal-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          }
          .mantine-Modal-inner { position: fixed; inset: 0; display: flex;
            align-items: center; justify-content: center; }
          [role="dialog"] { background: white; padding: 20px; min-width: 384px; }
        </style>
      </head>
      <body>
        <main><h1>Page chrome — invisible behind backdrop</h1></main>
        <div class="mfe-repair">
          <div>
            <div class="mantine-Modal-root z-100">
              <div class="mfe-repair">
                <div class="mantine-Overlay-root mantine-Modal-overlay"></div>
                <div class="mantine-Modal-inner">
                  <section role="dialog" tabindex="-1" aria-modal="true">
                    <h2>Upload images</h2>
                    <p>Drag and drop or choose a file</p>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('get_text', {}, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('🪟 Auto-scoped to open modal');
    expect(text).toContain('Upload images');
    expect(text).toContain('Drag and drop or choose a file');
    expect(text).not.toContain('Page chrome');
  }, 30000);
});

d('click overlay change detection (dialogs, menus, listboxes)', () => {
  afterEach(async () => {
    await handleToolCall('close', {}, mockServer);
  });

  test('reports a dialog opened by the click', async () => {
    const html = `
      <!DOCTYPE html>
      <html><head><title>Dialog open test</title></head>
      <body>
        <button data-testid="opener">Open</button>
        <div id="d" role="dialog" aria-modal="true" aria-label="Confirm" style="display:none">
          <p>are you sure?</p>
        </div>
        <script>
          document.querySelector('[data-testid="opener"]').addEventListener('click', () => {
            document.getElementById('d').style.display = 'block';
          });
        </script>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:opener' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('↑ Dialog opened:');
    expect(text).toContain('aria-label="Confirm"');
    expect(text).toContain("dialog::");
  }, 30000);

  test('reports a dialog closed by the click', async () => {
    const html = `
      <!DOCTYPE html>
      <html><head><title>Dialog close test</title></head>
      <body>
        <div id="d" role="dialog" aria-modal="true" aria-label="Confirm">
          <p>are you sure?</p>
          <button data-testid="closer">Cancel</button>
        </div>
        <script>
          document.querySelector('[data-testid="closer"]').addEventListener('click', () => {
            document.getElementById('d').remove();
          });
        </script>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:closer' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('↓ Dialog closed:');
  }, 30000);

  test('does not report dialog change when no dialog state changed', async () => {
    const html = `
      <!DOCTYPE html>
      <html><head><title>No-op click</title></head>
      <body>
        <button data-testid="noop">Just a button</button>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:noop' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).not.toContain('Dialog opened');
    expect(text).not.toContain('Dialog closed');
    expect(text).not.toContain('Menu opened');
  }, 30000);

  test('reports a popup menu opened by the click', async () => {
    // Simulates a dropdown menu (role="menu") appearing after a button
    // click — the most common reason a click "doesn't visibly do anything"
    // from the agent's perspective.
    const html = `
      <!DOCTYPE html>
      <html><head><title>Menu test</title></head>
      <body>
        <button data-testid="trigger" aria-haspopup="menu">Actions</button>
        <ul id="m" role="menu" aria-label="Actions" style="display:none">
          <li role="menuitem">Edit</li>
          <li role="menuitem">Delete</li>
        </ul>
        <script>
          document.querySelector('[data-testid="trigger"]').addEventListener('click', () => {
            document.getElementById('m').style.display = 'block';
          });
        </script>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:trigger' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('↑ Menu opened:');
    expect(text).toContain('aria-label="Actions"');
    // Menu should NOT include the dialog:: tip (only dialogs do).
    expect(text).not.toContain("dialog::");
  }, 30000);

  test('reports a listbox opened by the click', async () => {
    // Combobox-style: clicking a trigger reveals a listbox (e.g. select replacement).
    const html = `
      <!DOCTYPE html>
      <html><head><title>Listbox test</title></head>
      <body>
        <button data-testid="combo" role="combobox" aria-haspopup="listbox">Choose</button>
        <ul id="lb" role="listbox" aria-label="Options" style="display:none">
          <li role="option">A</li>
          <li role="option">B</li>
        </ul>
        <script>
          document.querySelector('[data-testid="combo"]').addEventListener('click', () => {
            document.getElementById('lb').style.display = 'block';
          });
        </script>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:combo' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('↑ Listbox opened:');
    expect(text).toContain('aria-label="Options"');
  }, 30000);

  test('reports a Radix-style popover opened (data-state="open")', async () => {
    // Modern UI libraries (Radix, Headless UI) signal popover state via
    // data-state="open" on the content wrapper. We pick that up too.
    const html = `
      <!DOCTYPE html>
      <html><head><title>Radix popover</title></head>
      <body>
        <button data-testid="pop">Open popover</button>
        <div id="pp" data-state="closed" role="menu" aria-label="More" style="display:none">
          <p>popover body</p>
        </div>
        <script>
          document.querySelector('[data-testid="pop"]').addEventListener('click', () => {
            const el = document.getElementById('pp');
            el.setAttribute('data-state', 'open');
            el.style.display = 'block';
          });
        </script>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:pop' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('↑ Menu opened:');
    expect(text).toContain('aria-label="More"');
  }, 30000);

  test('reports a menu closed by the click', async () => {
    const html = `
      <!DOCTYPE html>
      <html><head><title>Menu close</title></head>
      <body>
        <ul id="m" role="menu" aria-label="Actions">
          <li role="menuitem" data-testid="edit">Edit</li>
        </ul>
        <script>
          document.querySelector('[data-testid="edit"]').addEventListener('click', () => {
            document.getElementById('m').remove();
          });
        </script>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:edit' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('↓ Menu closed:');
  }, 30000);
});

d('click interception diagnostics', () => {
  afterEach(async () => {
    await handleToolCall('close', {}, mockServer);
  });

  test('reports the intercepting element when an overlay covers the target', async () => {
    // The button is fully covered by a fixed overlay with pointer-events
    // enabled. Playwright's actionability check will fail with "intercepts
    // pointer events" — our diagnostic should name the overlay.
    const html = `
      <!DOCTYPE html>
      <html><head><title>Overlay test</title>
        <style>
          body { margin: 0; }
          #target { width: 200px; height: 50px; }
          #overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); }
        </style>
      </head>
      <body>
        <button id="target" data-testid="target-btn">Click me</button>
        <div id="overlay" data-testid="modal-backdrop"></div>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const start = Date.now();
    const res = await handleToolCall('click', { selector: 'testid:target-btn' }, mockServer);
    const elapsed = Date.now() - start;

    expect(res.isError).toBe(true);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('pointer events intercepted');
    expect(text).toContain('Intercepted by:');
    // The overlay has data-testid="modal-backdrop" — diagnostic should suggest it.
    expect(text).toContain('modal-backdrop');
    expect(text).toContain('Options:');
    // Should fail fast (not the 30s default Playwright timeout).
    expect(elapsed).toBeLessThan(15000);
  }, 30000);

  test('interception remediation suggests dismissing an open modal first', async () => {
    // Real-world failure mode: a modal is open and the agent tries to click
    // something behind it. The diagnostic should call out "dismiss the
    // modal" as the most likely fix, not just generic "click the overlay".
    // Mimics Mantine/Radix nested structure: backdrop + dialog content
    // both wrapped in a modal-root container.
    const html = `
      <!DOCTYPE html>
      <html><head><title>Modal-blocked click</title>
        <style>
          body { margin: 0; }
          #target { width: 200px; height: 50px; }
          .modal-root { position: relative; z-index: 100; }
          .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); }
          .dialog { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
            background: white; padding: 20px; }
        </style>
      </head>
      <body>
        <button id="target" data-testid="behind-btn">Click me</button>
        <div class="modal-root">
          <div class="backdrop"></div>
          <div class="dialog" role="dialog" aria-modal="true" aria-label="Confirm action">
            <p>Are you sure?</p>
          </div>
        </div>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:behind-btn' }, mockServer);
    expect(res.isError).toBe(true);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('pointer events intercepted');
    expect(text).toContain('The interceptor is inside an open modal');
    expect(text).toContain('Confirm action');
    expect(text).toContain('press_key with key="Escape"');
  }, 30000);

  test('modal-dismiss hint NOT shown when interceptor is unrelated to open modal', async () => {
    // A benign modal is open in a corner of the page, but the click target
    // is intercepted by a cookie banner that is NOT inside any dialog.
    // Suggesting "dismiss the modal" would mislead the agent — the cookie
    // banner is the actual fix.
    const html = `
      <!DOCTYPE html>
      <html><head><title>Unrelated interceptor</title>
        <style>
          body { margin: 0; }
          #target { position: absolute; top: 200px; left: 50px; width: 200px; height: 50px; }
          /* Benign modal in corner — not over the click point */
          .side-modal { position: fixed; top: 0; right: 0; width: 200px; height: 100px;
            background: white; padding: 10px; }
          /* Cookie banner intercepting the click — NOT inside a dialog */
          .cookie-banner { position: fixed; top: 200px; left: 0; right: 0; height: 100px;
            background: rgba(0,0,0,0.8); color: white; padding: 20px; z-index: 1000; }
        </style>
      </head>
      <body>
        <button id="target" data-testid="behind-cookies">Click me</button>
        <div class="side-modal" role="dialog" aria-modal="true" aria-label="Notifications">
          <p>You have 3 unread notifications.</p>
        </div>
        <div class="cookie-banner" data-testid="cookie-banner">
          Please accept cookies to continue.
        </div>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:behind-cookies' }, mockServer);
    expect(res.isError).toBe(true);
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).toContain('pointer events intercepted');
    // Diagnostic should name the cookie banner as the interceptor.
    expect(text).toContain('cookie-banner');
    // Should NOT suggest dismissing the unrelated notifications modal.
    expect(text).not.toContain('inside an open modal');
    expect(text).not.toContain('Notifications');
  }, 30000);
});

d('overlay snapshot stability', () => {
  afterEach(async () => {
    await handleToolCall('close', {}, mockServer);
  });

  test('text-fingerprint is stable across badge-count changes (no false closed+opened)', async () => {
    // Menu items with a numeric badge that changes between snapshots used
    // to flip the snapshot key, producing a spurious "closed + opened"
    // pair. Digit normalization should make the key stable.
    const html = `
      <!DOCTYPE html>
      <html><head><title>Badge count test</title></head>
      <body>
        <button data-testid="trigger">Toggle badge</button>
        <ul role="menu">
          <li role="menuitem" id="badge">Inbox (3)</li>
        </ul>
        <script>
          let n = 3;
          document.querySelector('[data-testid="trigger"]').addEventListener('click', () => {
            n = n + 1;
            document.getElementById('badge').textContent = 'Inbox (' + n + ')';
          });
        </script>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:trigger' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    // Even though the menu's text changed (3 → 4), the menu wasn't actually
    // opened or closed — it was already there. Should report no overlay
    // change.
    expect(text).not.toContain('Menu opened');
    expect(text).not.toContain('Menu closed');
  }, 30000);

  test('Headless UI trigger button does NOT false-positive as a popup', async () => {
    // Headless UI sets data-headlessui-state="open" on EVERY component when
    // active — including trigger buttons. Without role qualification, a
    // click on a Disclosure button would be reported as "↑ Popup opened".
    const html = `
      <!DOCTYPE html>
      <html><head><title>Headless UI trigger test</title></head>
      <body>
        <button data-testid="trigger" data-headlessui-state="closed">Toggle</button>
        <div data-testid="panel" data-headlessui-state="closed" style="display:none">
          Panel content
        </div>
        <script>
          document.querySelector('[data-testid="trigger"]').addEventListener('click', () => {
            // Simulate Headless UI flipping state on BOTH trigger and panel.
            document.querySelector('[data-testid="trigger"]').setAttribute('data-headlessui-state', 'open');
            const panel = document.querySelector('[data-testid="panel"]');
            panel.setAttribute('data-headlessui-state', 'open');
            panel.style.display = 'block';
          });
        </script>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('click', { selector: 'testid:trigger' }, mockServer);
    expect(res.isError).toBe(false);
    const text = res.content.map((c: any) => c.text).join('\n');
    // The panel has no role, and the trigger button has no role — neither
    // should be reported. (If we ever support generic disclosure panels,
    // this test should be updated.)
    expect(text).not.toContain('Popup opened');
    expect(text).not.toContain('Menu opened');
  }, 30000);

  test('dialog::SELECTOR returns no matches when no dialog is open', async () => {
    // Regression test for the no-visible-dialog path: previously
    // createScopedLocator silently scoped to .nth(0) (often the first
    // hidden dialog left in the DOM). Now it must return a clean
    // "No elements found" so the agent knows nothing matched.
    const html = `
      <!DOCTYPE html>
      <html><head><title>No dialog open</title></head>
      <body>
        <main><p>just a page</p></main>
        <!-- Dialog left in DOM but not actually open -->
        <div role="dialog" aria-hidden="true" style="display:none">
          <p>hidden dialog content</p>
        </div>
      </body></html>
    `;
    const nav = await handleToolCall('navigate', { url: dataUrl(html), headless: true }, mockServer);
    expect(nav.isError).toBe(false);

    const res = await handleToolCall('get_text', { selector: 'dialog::p' }, mockServer);
    // Either an error response or success with explicit "no elements" wording.
    const text = res.content.map((c: any) => c.text).join('\n');
    expect(text).not.toContain('hidden dialog content');
    expect(text).not.toContain('just a page');
  }, 30000);
});
