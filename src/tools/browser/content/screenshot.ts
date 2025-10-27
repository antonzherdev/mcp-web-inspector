import fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Page } from 'playwright';
import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';
import { getScreenshotsDir } from '../../../toolHandler.js';

/**
 * Tool for taking screenshots of pages or elements
 */
export class ScreenshotTool extends BrowserToolBase {
  private screenshots = new Map<string, string>();

  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    const screenshotsDir = sessionConfig?.screenshotsDir || './.mcp-web-inspector/screenshots';

    return {
      name: "screenshot",
      description: `⚠️ RARELY NEEDED: Screenshots are NOT useful for LLMs to analyze layouts, margins, or alignment issues. Use inspect_dom(), compare_positions(), or measure_element() instead - they provide precise numerical data. Only take screenshots for: (1) sharing with humans for visual confirmation, (2) documenting test results, or (3) verifying colors/images. Screenshots are saved to ${screenshotsDir}. Example: { name: "login-page", fullPage: true } or { name: "submit-btn", selector: "testid:submit" }`,
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name for the screenshot file (without extension). Example: 'login-page' or 'error-state'"
          },
          selector: {
            type: "string",
            description: "CSS selector or testid shorthand for element to screenshot. Example: '#submit-button' or 'testid:login-form'. Omit to capture full viewport."
          },
          fullPage: {
            type: "boolean",
            description: "Capture entire scrollable page instead of just viewport (default: false)"
          },
          downloadsDir: {
            type: "string",
            description: `Custom directory for saving screenshot (default: ${screenshotsDir}). Example: './my-screenshots'`
          },
        },
        required: ["name"],
      },
    };
  }

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
        context.server.notification({
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
