import fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Page } from 'playwright';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse } from '../common/types.js';
import { getScreenshotsDir } from '../../toolHandler.js';

const defaultDownloadsPath = path.join(os.homedir(), 'Downloads');

/**
 * Tool for taking screenshots of pages or elements
 */
export class ScreenshotTool extends BrowserToolBase {
  private screenshots = new Map<string, string>();

  /**
   * Execute the screenshot tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const screenshotOptions: any = {
        type: args.type || "png",
        fullPage: !!args.fullPage
      };

      if (args.selector) {
        // Normalize selector (support testid: shorthand)
        const selector = this.normalizeSelector(args.selector);
        const element = await page.$(selector);
        if (!element) {
          return {
            content: [{
              type: "text",
              text: `Element not found: ${selector}`,
            }],
            isError: true
          };
        }
        screenshotOptions.element = element;
      }

      // Generate output path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${args.name || 'screenshot'}-${timestamp}.png`;
      // Use screenshots directory from config, fall back to downloadsDir arg, then default Downloads
      const downloadsDir = args.downloadsDir || getScreenshotsDir();

      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }

      const outputPath = path.join(downloadsDir, filename);
      screenshotOptions.path = outputPath;

      const screenshot = await page.screenshot(screenshotOptions);
      const base64Screenshot = screenshot.toString('base64');

      const messages = [`✓ Screenshot saved to: ${path.relative(process.cwd(), outputPath)}`];

      // Handle base64 storage
      if (args.storeBase64 !== false) {
        this.screenshots.set(args.name || 'screenshot', base64Screenshot);
        this.server.notification({
          method: "notifications/resources/list_changed",
        });

        messages.push(`Screenshot also stored in memory with name: '${args.name || 'screenshot'}'`);
      }

      // Add actionable guidance based on screenshot context
      messages.push('');
      messages.push('💡 To debug layout issues in this screenshot:');
      if (args.selector) {
        messages.push(`   inspect_ancestors({ selector: "${args.selector}" })`);
        messages.push('   → See parent constraints (width, margins, overflow, borders)');
      } else {
        messages.push('   1. Find the element: inspect_dom({}) or get_test_ids()');
        messages.push('   2. Check parent constraints: inspect_ancestors({ selector: "..." })');
        messages.push('   3. Compare alignment: compare_element_alignment({ selector1: "...", selector2: "..." })');
      }

      return createSuccessResponse(messages);
    });
  }

  /**
   * Get all stored screenshots
   */
  getScreenshots(): Map<string, string> {
    return this.screenshots;
  }
} 