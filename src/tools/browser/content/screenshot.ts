import fs from 'node:fs';
import * as path from 'node:path';
import type { Page } from 'playwright';
import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';
import { makeConfirmPreview } from '../../common/confirm_output.js';

/**
 * Tool for taking screenshots of pages or elements
 */
export class ScreenshotTool extends BrowserToolBase {
  private screenshots = new Map<string, string>();

  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    const screenshotsDir = sessionConfig?.screenshotsDir || './.mcp-web-inspector/screenshots';

    const description = [
      '📸 VISUAL OUTPUT TOOL - Captures page/element appearance and saves to file. Essential for: visual regression testing, sharing with humans, confirming UI appearance (colors/fonts/images).',
      '',
      '❌ WRONG: "Take screenshot to debug button alignment"',
      '✅ RIGHT: "Use compare_element_alignment() - alignment in <100 tokens"',
      '',
      '❌ WRONG: "Screenshot to check element visibility"',
      '✅ RIGHT: "Use check_visibility() - instant visibility + diagnostics"',
      '',
      '❌ WRONG: "Screenshot to inspect layout structure"',
      '✅ RIGHT: "Use inspect_dom() - hierarchy with positions and visibility"',
      '',
      '✅ VALID: "Share with designer for feedback"',
      '✅ VALID: "Visual regression check"',
      '✅ VALID: "Confirm gradient/shadow rendering"',
      '',
      '⚠️ Token cost: ~1,500 tokens to read. Structural tools: <100 tokens.',
      '',
      `Screenshots saved to ${screenshotsDir}. Example: { name: "login-page", fullPage: true } or { name: "submit-btn", selector: "testid:submit" }`
    ].join('\n');

    return {
      name: "visual_screenshot_for_humans",
      description,
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
          }
        ,
        required: ["name"]
      }
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      // Defer the screenshot capture until confirmation via confirm_output
      const thunk = async (): Promise<string> => {
        const screenshotOptions: any = {
          type: args.type || "png",
          fullPage: !!args.fullPage
        };

        if (args.selector) {
          const selector = this.normalizeSelector(args.selector);
          const element = await page.$(selector);
          if (!element) {
            throw new Error(`Element not found: ${selector}`);
          }
          screenshotOptions.element = element;
        }

        const { getScreenshotsDir } = await import('../../../toolHandler.js');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${args.name || 'screenshot'}-${timestamp}.png`;
        const downloadsDir = args.downloadsDir || getScreenshotsDir();

        if (!fs.existsSync(downloadsDir)) {
          fs.mkdirSync(downloadsDir, { recursive: true });
        }

        const outputPath = path.join(downloadsDir, filename);
        screenshotOptions.path = outputPath;

        const screenshot = await page.screenshot(screenshotOptions);
        const base64Screenshot = screenshot.toString('base64');

        const messages = [`✓ Screenshot saved to: ${path.relative(process.cwd(), outputPath)}`];

        if (args.storeBase64 !== false) {
          this.screenshots.set(args.name || 'screenshot', base64Screenshot);
          context.server.notification({ method: "notifications/resources/list_changed" });
          messages.push(`Screenshot also stored in memory with name: '${args.name || 'screenshot'}'`);
        }

        messages.push('');
        messages.push('📸 Open the file in your IDE to view the screenshot');
        messages.push('⚠️ Reading the image file consumes ~1,500 tokens — use structural tools for layout debugging');
        messages.push('');
        messages.push('💡 To debug layout issues without reading the screenshot:');
        if (args.selector) {
          messages.push(`   inspect_ancestors({ selector: "${args.selector}" })`);
          messages.push('   → See parent constraints (width, margins, overflow, borders)');
        } else {
          messages.push('   1) Find the element: inspect_dom({}) or get_test_ids()');
          messages.push('   2) Check parent constraints: inspect_ancestors({ selector: "..." })');
          messages.push('   3) Compare alignment: compare_element_alignment({ selector1: "...", selector2: "..." })');
        }

        return messages.join('\n');
      };

      // Return a minimal preview that suggests better alternatives
      const preview = makeConfirmPreview(thunk, {
        previewLines: [
          'Screenshot requested. For debugging, prefer:',
          '  • inspect_dom() - structure, positions, visibility',
          '  • compare_element_alignment() - alignment with pixel diffs',
          '  • get_computed_styles() - CSS values',
          '  • inspect_ancestors() - constraints and overflow',
        ],
      });
      return createSuccessResponse(preview.lines.join('\n'));
    });
  }

  /**
   * Get all stored screenshots
   */
  getScreenshots(): Map<string, string> {
    return this.screenshots;
  }
}
