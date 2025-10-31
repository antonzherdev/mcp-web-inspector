import fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Page } from 'playwright';
import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

/**
 * Tool for taking screenshots of pages or elements
 */
export class ScreenshotTool extends BrowserToolBase {
  private screenshots = new Map<string, string>();

  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    const screenshotsDir = sessionConfig?.screenshotsDir || './.mcp-web-inspector/screenshots';

    return {
      name: "visual_screenshot_for_humans",
      description: `📸 VISUAL OUTPUT TOOL - Captures page/element appearance and saves to file. Essential for: visual regression testing, sharing with humans, confirming UI appearance (colors/fonts/images).

❌ WRONG: "Take screenshot to debug button alignment"
✅ RIGHT: "Use compare_element_alignment() - alignment in <100 tokens"

❌ WRONG: "Screenshot to check element visibility"
✅ RIGHT: "Use check_visibility() - instant visibility + diagnostics"

❌ WRONG: "Screenshot to inspect layout structure"
✅ RIGHT: "Use inspect_dom() - hierarchy with positions and visibility"

✅ VALID: "Share with designer for feedback"
✅ VALID: "Visual regression check"
✅ VALID: "Confirm gradient/shadow rendering"

⚠️ Token cost: ~1,500 tokens to read. Structural tools: <100 tokens.

Admin control (optional): set env MCP_SCREENSHOT_GUARD=strict to block execution (prevents misuse by default). Unset to allow visuals for human review.

Screenshots saved to ${screenshotsDir}. Example: { name: "login-page", fullPage: true } or { name: "submit-btn", selector: "testid:submit" }`,
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
        },
        required: ["name"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      // Optional guardrail to reduce unreasonable calls by LLMs.
      // If MCP_SCREENSHOT_GUARD is set to 'strict', block execution.
      const guard = (process.env.MCP_SCREENSHOT_GUARD || '').toLowerCase();
      const strictGuard = guard === '1' || guard === 'true' || guard === 'strict';
      if (strictGuard) {
        const lines: string[] = [];
        lines.push('🚫 Screenshot blocked by admin guard (MCP_SCREENSHOT_GUARD=strict).');
        lines.push('');
        lines.push('Use structural tools for programmatic debugging:');
        lines.push('  - inspect_dom()               → hierarchy, positions, visibility');
        lines.push('  - compare_element_alignment() → alignment and pixel diffs');
        lines.push('  - get_computed_styles()       → CSS values');
        lines.push('  - inspect_ancestors()         → parent constraints and overflow');
        lines.push('');
        lines.push('If a human needs to review visuals, ask an admin to unset MCP_SCREENSHOT_GUARD.');
        return createSuccessResponse(lines.join('\n'));
      }

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

      const { getScreenshotsDir } = await import('../../../toolHandler.js');
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

      // Add token cost warning
      messages.push('');
      messages.push('📸 Open the file in your IDE to view the screenshot');
      messages.push('⚠️ Reading the image file consumes ~1,500 tokens — use structural tools for layout debugging');

      // Add actionable guidance based on screenshot context
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
