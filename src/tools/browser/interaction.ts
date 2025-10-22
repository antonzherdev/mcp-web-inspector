import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';
import { setGlobalPage } from '../../toolHandler.js';
/**
 * Tool for clicking elements on the page
 */
export class ClickTool extends BrowserToolBase {
  /**
   * Execute the click tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      await page.click(selector);
      return createSuccessResponse(`Clicked element: ${args.selector}`);
    });
  }
}
/**
 * Tool for clicking a link and switching to the new tab
 */
export class ClickAndSwitchTabTool extends BrowserToolBase {
  /**
   * Execute the click and switch tab tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      // Listen for a new tab to open
      const [newPage] = await Promise.all([
        //context.browser.waitForEvent('page'), // Wait for a new page (tab) to open
        page.context().waitForEvent('page'),// Wait for a new page (tab) to open
        page.click(selector), // Click the link that opens the new tab
      ]);

      // Wait for the new page to load
      await newPage.waitForLoadState('domcontentloaded');

      // Switch control to the new tab
      setGlobalPage(newPage);
      //page= newPage; // Update the current page to the new tab
      //context.page = newPage;
      //context.page.bringToFront(); // Bring the new tab to the front
      return createSuccessResponse(`Clicked link and switched to new tab: ${newPage.url()}`);
      //return createSuccessResponse(`Clicked link and switched to new tab: ${context.page.url()}`);
    });
  }
}
/**
 * Tool for clicking elements inside iframes
 */
export class IframeClickTool extends BrowserToolBase {
  /**
   * Execute the iframe click tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const iframeSelector = this.normalizeSelector(args.iframeSelector);
      const selector = this.normalizeSelector(args.selector);
      const frame = page.frameLocator(iframeSelector);
      if (!frame) {
        return createErrorResponse(`Iframe not found: ${args.iframeSelector}`);
      }

      await frame.locator(selector).click();
      return createSuccessResponse(`Clicked element ${args.selector} inside iframe ${args.iframeSelector}`);
    });
  }
}

/**
 * Tool for filling elements inside iframes
 */
export class IframeFillTool extends BrowserToolBase {
  /**
   * Execute the iframe fill tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const iframeSelector = this.normalizeSelector(args.iframeSelector);
      const selector = this.normalizeSelector(args.selector);
      const frame = page.frameLocator(iframeSelector);
      if (!frame) {
        return createErrorResponse(`Iframe not found: ${args.iframeSelector}`);
      }

      await frame.locator(selector).fill(args.value);
      return createSuccessResponse(`Filled element ${args.selector} inside iframe ${args.iframeSelector} with: ${args.value}`);
    });
  }
}

/**
 * Tool for filling form fields
 */
export class FillTool extends BrowserToolBase {
  /**
   * Execute the fill tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      await page.waitForSelector(selector);
      await page.fill(selector, args.value);
      return createSuccessResponse(`Filled ${args.selector} with: ${args.value}`);
    });
  }
}

/**
 * Tool for selecting options from dropdown menus
 */
export class SelectTool extends BrowserToolBase {
  /**
   * Execute the select tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      await page.waitForSelector(selector);
      await page.selectOption(selector, args.value);
      return createSuccessResponse(`Selected ${args.selector} with: ${args.value}`);
    });
  }
}

/**
 * Tool for hovering over elements
 */
export class HoverTool extends BrowserToolBase {
  /**
   * Execute the hover tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const selector = this.normalizeSelector(args.selector);
      await page.waitForSelector(selector);
      await page.hover(selector);
      return createSuccessResponse(`Hovered ${args.selector}`);
    });
  }
}

/**
 * Tool for uploading files
 */
export class UploadFileTool extends BrowserToolBase {
  /**
   * Execute the upload file tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
        const selector = this.normalizeSelector(args.selector);
        await page.waitForSelector(selector);
        await page.setInputFiles(selector, args.filePath);
        return createSuccessResponse(`Uploaded file '${args.filePath}' to '${args.selector}'`);
    });
  }
}

/**
 * Tool for executing JavaScript in the browser
 */
export class EvaluateTool extends BrowserToolBase {
  /**
   * Detect common patterns and suggest better tools
   */
  private detectBetterToolSuggestions(script: string): string[] {
    const suggestions: string[] = [];
    const scriptLower = script.toLowerCase();

    // Pattern: DOM inspection/querying
    if (scriptLower.match(/queryselector|getelementby|getelement|innerhtml|outerhtml|children|childnodes/)) {
      suggestions.push('📍 DOM Inspection - Use inspect_dom({ selector: "..." }) for page structure');
    }

    // Pattern: Getting text content
    if (scriptLower.match(/textcontent|innertext/)) {
      suggestions.push('📝 Text Content - Use get_visible_text() or find_by_text({ text: "..." })');
    }

    // Pattern: Getting element position/size/layout
    if (scriptLower.match(/getboundingclientrect|offsetwidth|offsetheight|offsetleft|offsettop|clientwidth|clientheight/)) {
      suggestions.push('📏 Element Measurements - Use measure_element({ selector: "..." })');
    }

    // Pattern: Walking up DOM tree / checking parents
    if (scriptLower.match(/parentelement|parentnode|offsetparent|closest/) ||
        (scriptLower.match(/while.*parent/) && scriptLower.match(/getcomputedstyle/))) {
      suggestions.push('🔼 Parent Chain - Use inspect_ancestors({ selector: "..." }) to see parent constraints');
    }

    // Pattern: Checking visibility
    if (scriptLower.match(/offsetparent|visibility|display.*none|opacity/)) {
      suggestions.push('👁️  Visibility Check - Use element_visibility({ selector: "..." })');
    }

    // Pattern: Getting computed styles
    if (scriptLower.match(/getcomputedstyle|style\.|currentstyle/)) {
      suggestions.push('🎨 CSS Styles - Use get_computed_styles({ selector: "..." })');
    }

    // Pattern: Checking element existence
    if (scriptLower.match(/\!=\s*null|\!==\s*null/) && scriptLower.match(/queryselector/)) {
      suggestions.push('✓ Element Existence - Use element_exists({ selector: "..." })');
    }

    // Pattern: Finding test IDs
    if (scriptLower.match(/data-testid|data-test|data-cy/)) {
      suggestions.push('🔍 Test IDs - Use get_test_ids() to discover all test identifiers');
    }

    // Pattern: Comparing positions/alignment
    if (scriptLower.match(/getboundingclientrect.*getboundingclientrect/) ||
        (scriptLower.match(/\.left|\.top|\.right|\.bottom/) && scriptLower.match(/===|==|!==|!=/))) {
      suggestions.push('⚖️  Position Comparison - Use compare_positions({ selector1: "...", selector2: "..." })');
    }

    return suggestions;
  }

  /**
   * Execute the evaluate tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const result = await page.evaluate(args.script);

      // Convert result to string for display
      let resultStr: string;
      try {
        resultStr = JSON.stringify(result, null, 2);
      } catch (error) {
        resultStr = String(result);
      }

      const messages = [
        `✓ Executed JavaScript:`,
        `${args.script}`,
        ``,
        `Result:`,
        `${resultStr}`
      ];

      // Detect if specialized tools would be better
      const suggestions = this.detectBetterToolSuggestions(args.script);
      if (suggestions.length > 0) {
        messages.push('');
        messages.push('💡 Consider using specialized tools instead:');
        suggestions.forEach(suggestion => messages.push(`   ${suggestion}`));
        messages.push('');
        messages.push('ℹ️  Specialized tools are more reliable and token-efficient than evaluate()');
      }

      return createSuccessResponse(messages);
    });
  }
}

/**
 * Tool for dragging elements on the page
 */
export class DragTool extends BrowserToolBase {
  /**
   * Execute the drag tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      const sourceSelector = this.normalizeSelector(args.sourceSelector);
      const targetSelector = this.normalizeSelector(args.targetSelector);
      const sourceElement = await page.waitForSelector(sourceSelector);
      const targetElement = await page.waitForSelector(targetSelector);

      const sourceBound = await sourceElement.boundingBox();
      const targetBound = await targetElement.boundingBox();

      if (!sourceBound || !targetBound) {
        return createErrorResponse("Could not get element positions for drag operation");
      }

      await page.mouse.move(
        sourceBound.x + sourceBound.width / 2,
        sourceBound.y + sourceBound.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        targetBound.x + targetBound.width / 2,
        targetBound.y + targetBound.height / 2
      );
      await page.mouse.up();

      return createSuccessResponse(`Dragged element from ${args.sourceSelector} to ${args.targetSelector}`);
    });
  }
}

/**
 * Tool for pressing keyboard keys
 */
export class PressKeyTool extends BrowserToolBase {
  /**
   * Execute the key press tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    this.recordInteraction();
    return this.safeExecute(context, async (page) => {
      if (args.selector) {
        const selector = this.normalizeSelector(args.selector);
        await page.waitForSelector(selector);
        await page.focus(selector);
      }

      await page.keyboard.press(args.key);
      return createSuccessResponse(`Pressed key: ${args.key}`);
    });
  }
} 


/**
 * Tool for switching browser tabs
 */
// export class SwitchTabTool extends BrowserToolBase {
//   /**
//    * Switch the tab to the specified index
//    */
//   async execute(args: any, context: ToolContext): Promise<ToolResponse> {
//     return this.safeExecute(context, async (page) => {
//       const tabs = await browser.page;      

//       // Validate the tab index
//       const tabIndex = Number(args.index);
//       if (isNaN(tabIndex)) {
//         return createErrorResponse(`Invalid tab index: ${args.index}. It must be a number.`);
//       }

//       if (tabIndex >= 0 && tabIndex < tabs.length) {
//         await tabs[tabIndex].bringToFront();
//         return createSuccessResponse(`Switched to tab with index ${tabIndex}`);
//       } else {
//         return createErrorResponse(
//           `Tab index out of range: ${tabIndex}. Available tabs: 0 to ${tabs.length - 1}.`
//         );
//       }
//     });
//   }
// }