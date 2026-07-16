import { test, expect, afterEach, describe } from '@jest/globals';
import { ensureBrowser, closeBrowser, resetBrowserState } from '../toolHandler.js';
import { browserAvailable } from './helpers/browserSetup.js';

const d = browserAvailable ? describe : describe.skip;

d('closeBrowser', () => {
  afterEach(async () => {
    await closeBrowser();
    resetBrowserState();
  });

  test('actually terminates the browser instead of just dropping the reference', async () => {
    const page = await ensureBrowser({ headless: true });
    const browser = page.context().browser()!;
    expect(browser.isConnected()).toBe(true);

    await closeBrowser();

    // The regression this guards: state was reset while the process lived on,
    // unreachable and holding memory until the server itself exited.
    expect(browser.isConnected()).toBe(false);
  }, 30000);

  test('is safe to call when no browser is running', async () => {
    resetBrowserState();
    await expect(closeBrowser()).resolves.toBeUndefined();
  });

  test('is idempotent', async () => {
    await ensureBrowser({ headless: true });
    await closeBrowser();
    await expect(closeBrowser()).resolves.toBeUndefined();
  }, 30000);

  test('a later ensureBrowser gets a fresh working browser', async () => {
    const first = await ensureBrowser({ headless: true });
    const firstBrowser = first.context().browser()!;
    await closeBrowser();

    const second = await ensureBrowser({ headless: true });
    expect(second.context().browser()!.isConnected()).toBe(true);
    expect(second.context().browser()).not.toBe(firstBrowser);
  }, 45000);
});
