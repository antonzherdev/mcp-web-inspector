/**
 * Test to reproduce the console log issue when switching tabs.
 *
 * Issue: When using setGlobalPage() to switch to a new tab (e.g., via ClickAndSwitchTabTool),
 * console message listeners are not registered on the new page, so console logs from that
 * page are not captured.
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { jest } from '@jest/globals';

describe('Console logs after tab switch - Bug Reproduction', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page1: Page;
  let page2: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
  });

  afterAll(async () => {
    await browser.close();
  });

  afterEach(async () => {
    if (page1 && !page1.isClosed()) {
      await page1.close();
    }
    if (page2 && !page2.isClosed()) {
      await page2.close();
    }
  });

  test('should demonstrate that new pages do not have console listeners by default', async () => {
    const capturedLogs: string[] = [];

    // Create first page and add console listener
    page1 = await context.newPage();
    page1.on('console', (msg) => {
      capturedLogs.push(`Page1: ${msg.text()}`);
    });

    await page1.goto('about:blank');
    await page1.evaluate(() => {
      console.log('Message from page 1');
    });

    // Create second page WITHOUT adding console listener (this is what setGlobalPage does)
    page2 = await context.newPage();
    // Note: NO console listener registered here

    await page2.goto('about:blank');
    await page2.evaluate(() => {
      console.log('Message from page 2 - NOT CAPTURED');
    });

    // Wait a bit for messages
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Captured logs:', capturedLogs);

    // We should only see page1's log
    expect(capturedLogs).toContain('Page1: Message from page 1');

    // page2's log should NOT be captured because we didn't register a listener
    const hasPage2Message = capturedLogs.some(log => log.includes('Message from page 2'));
    expect(hasPage2Message).toBe(false);
  });

  test('should show that adding listener to new page captures its logs', async () => {
    const capturedLogs: string[] = [];

    // Create first page and add console listener
    page1 = await context.newPage();
    page1.on('console', (msg) => {
      capturedLogs.push(`Page1: ${msg.text()}`);
    });

    await page1.goto('about:blank');
    await page1.evaluate(() => {
      console.log('Message from page 1');
    });

    // Create second page AND add console listener (this is what SHOULD happen)
    page2 = await context.newPage();
    page2.on('console', (msg) => {
      capturedLogs.push(`Page2: ${msg.text()}`);
    });

    await page2.goto('about:blank');
    await page2.evaluate(() => {
      console.log('Message from page 2 - CAPTURED');
    });

    // Wait a bit for messages
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Captured logs:', capturedLogs);

    // We should see both pages' logs
    expect(capturedLogs).toContain('Page1: Message from page 1');
    expect(capturedLogs).toContain('Page2: Message from page 2 - CAPTURED');
  });
});
