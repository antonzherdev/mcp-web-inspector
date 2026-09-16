import { jest } from '@jest/globals';
import { ScreenshotTool } from '../screenshot.js';
import type { ToolContext } from '../../../common/types.js';
import type { Page, Browser } from 'playwright';

jest.mock('node:fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mirrors MAX_STORED_SCREENSHOTS in ScreenshotTool.
const MAX_STORED = 10;

const mockPage = {
  screenshot: jest.fn().mockImplementation(() => Promise.resolve(Buffer.from('png-bytes'))),
  locator: jest.fn(),
  $: jest.fn(),
  isClosed: jest.fn().mockReturnValue(false),
} as unknown as Page;

const mockContext = {
  page: mockPage,
  browser: { isConnected: jest.fn().mockReturnValue(true) } as unknown as Browser,
  server: { notification: jest.fn(), sendMessage: jest.fn() },
} as ToolContext;

/**
 * Drives the real tool path: the first call returns a confirmation token, and
 * only confirming it actually stores the screenshot. Going through execute()
 * is what makes this a regression test — calling the eviction helper directly
 * would still pass if nothing invoked it.
 */
async function takeScreenshot(tool: ScreenshotTool, name: string) {
  const preview = await tool.execute({ name }, mockContext);
  const text = (preview.content[0] as any).text as string;
  const token = text.match(/confirm_output\(\{ token: "([\w\d]+)" \}\)/)?.[1];
  if (!token) throw new Error(`no confirmation token in preview: ${text}`);

  const { ConfirmOutputTool } = await import('../../../common/confirm_output.js');
  await new ConfirmOutputTool({}).execute({ token, reason: 'test' }, mockContext);
}

describe('in-memory screenshot eviction', () => {
  test('caps how many base64 screenshots are held', async () => {
    const tool = new ScreenshotTool({} as any);
    for (let i = 0; i < MAX_STORED + 8; i++) {
      await takeScreenshot(tool, `shot-${i}`);
    }

    expect(tool.getScreenshots().size).toBe(MAX_STORED);
  });

  test('evicts oldest first and keeps the newest', async () => {
    const tool = new ScreenshotTool({} as any);
    for (let i = 0; i < MAX_STORED + 2; i++) {
      await takeScreenshot(tool, `shot-${i}`);
    }

    const kept = tool.getScreenshots();
    expect(kept.has('shot-0')).toBe(false);
    expect(kept.has('shot-1')).toBe(false);
    expect(kept.has(`shot-${MAX_STORED + 1}`)).toBe(true);
  });

  test('keeps everything while under the cap', async () => {
    const tool = new ScreenshotTool({} as any);
    await takeScreenshot(tool, 'login');
    await takeScreenshot(tool, 'checkout');

    expect(tool.getScreenshots().size).toBe(2);
    expect([...tool.getScreenshots().keys()]).toEqual(['login', 'checkout']);
  });

  test('reusing a name does not count as a new entry', async () => {
    const tool = new ScreenshotTool({} as any);
    for (let i = 0; i < MAX_STORED; i++) await takeScreenshot(tool, `shot-${i}`);
    await takeScreenshot(tool, 'shot-0');

    expect(tool.getScreenshots().size).toBe(MAX_STORED);
    expect(tool.getScreenshots().has('shot-0')).toBe(true);
  });
});
