import { resetBrowserState } from "../../toolHandler.js";
import { ToolContext, ToolResponse, createErrorResponse, createSuccessResponse } from "../common/types.js";
import { BrowserToolBase } from "./base.js";

/**
 * Tool for getting the visible text content of the current page
 */
export class VisibleTextTool extends BrowserToolBase {
  /**
   * Execute the visible text page tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    // Check if browser is available
    if (!context.browser || !context.browser.isConnected()) {
      // If browser is not connected, we need to reset the state to force recreation
      resetBrowserState();
      return createErrorResponse(
        "Browser is not connected. The connection has been reset - please retry your navigation."
      );
    }

    // Check if page is available and not closed
    if (!context.page || context.page.isClosed()) {
      return createErrorResponse(
        "Page is not available or has been closed. Please retry your navigation."
      );
    }
    return this.safeExecute(context, async (page) => {
      try {
        // Normalize selector (support testid: shorthand)
        const selector = args.selector ? this.normalizeSelector(args.selector) : undefined;

        let rootElement;
        let selectionWarning = '';

        // If selector provided, use standard element selection
        if (selector) {
          const locator = page.locator(selector);
          const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator, {
            elementIndex: args.elementIndex,
          });

          selectionWarning = this.formatElementSelectionInfo(
            args.selector,
            elementIndex,
            totalCount
          );

          rootElement = element;
        }

        const visibleText = rootElement
          ? await rootElement.evaluate((el) => {
              const walker = document.createTreeWalker(
                el,
                NodeFilter.SHOW_TEXT,
                {
                  acceptNode: (node) => {
                    const style = window.getComputedStyle(node.parentElement!);
                    return (style.display !== "none" && style.visibility !== "hidden")
                      ? NodeFilter.FILTER_ACCEPT
                      : NodeFilter.FILTER_REJECT;
                  },
                }
              );

              const texts: string[] = [];
              let node;
              while ((node = walker.nextNode())) {
                const text = node.textContent?.trim();
                if (text) texts.push(text);
              }

              return texts.join("\n");
            })
          : await page.evaluate(() => {
              const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                  acceptNode: (node) => {
                    const style = window.getComputedStyle(node.parentElement!);
                    return (style.display !== "none" && style.visibility !== "hidden")
                      ? NodeFilter.FILTER_ACCEPT
                      : NodeFilter.FILTER_REJECT;
                  },
                }
              );

              const texts: string[] = [];
              let node;
              while ((node = walker.nextNode())) {
                const text = node.textContent?.trim();
                if (text) texts.push(text);
              }

              return texts.join("\n");
            });
        // Truncate logic
        const maxLength = typeof args.maxLength === 'number' ? args.maxLength : 20000;
        let output = visibleText;
        let truncated = false;
        if (output.length > maxLength) {
          output = output.slice(0, maxLength) + '\n[Output truncated due to size limits]';
          truncated = true;
        }

        // Add guidance footer
        const scopeInfo = selector ? ` (from "${args.selector}")` : " (entire page)";
        const guidance = `\n\n💡 TIP: If you need structured inspection rather than raw text:
   • inspect_dom() - See page structure with positions and relationships
   • find_by_text("text") - Locate specific text with element context
   • query_selector("selector") - Find and inspect specific elements`;

        const finalOutput = selectionWarning
          ? `${selectionWarning.trimEnd()}\n\nVisible text content${scopeInfo}:\n${output}${guidance}`
          : `Visible text content${scopeInfo}:\n${output}${guidance}`;

        return createSuccessResponse(finalOutput);
      } catch (error) {
        return createErrorResponse(`Failed to get visible text content: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Tool for getting the visible HTML content of the current page
 */
export class VisibleHtmlTool extends BrowserToolBase {
  /**
   * Execute the visible HTML page tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    // Check if browser is available
    if (!context.browser || !context.browser.isConnected()) {
      // If browser is not connected, we need to reset the state to force recreation
      resetBrowserState();
      return createErrorResponse(
        "Browser is not connected. The connection has been reset - please retry your navigation."
      );
    }

    // Check if page is available and not closed
    if (!context.page || context.page.isClosed()) {
      return createErrorResponse(
        "Page is not available or has been closed. Please retry your navigation."
      );
    }
    return this.safeExecute(context, async (page) => {
      try {
        // Normalize selector (support testid: shorthand)
        const selector = args.selector ? this.normalizeSelector(args.selector) : undefined;

        let rootElement;
        let selectionWarning = '';

        // If selector provided, use standard element selection
        if (selector) {
          const locator = page.locator(selector);
          const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator, {
            elementIndex: args.elementIndex,
          });

          selectionWarning = this.formatElementSelectionInfo(
            args.selector,
            elementIndex,
            totalCount
          );

          rootElement = element;
        }

        // Get the HTML content
        let htmlContent: string;

        if (rootElement) {
          // If a selector is provided, get only the HTML for that element
          htmlContent = await rootElement.evaluate((el) => el.outerHTML);
        } else {
          // Otherwise get the full page HTML
          htmlContent = await page.content();
        }

        // Determine cleanup level
        // Default: remove scripts only (security/size)
        // clean=true: remove scripts + styles + comments + meta
        const clean = args.clean === true;

        // Apply filters in the browser context
        htmlContent = await page.evaluate(
          ({ html, clean }) => {
            // Create a DOM parser to work with the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Always remove scripts (default behavior)
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => script.remove());

            // If clean=true, remove additional noise
            if (clean) {
              // Remove style tags
              const styles = doc.querySelectorAll('style');
              styles.forEach(style => style.remove());

              // Remove meta tags
              const metaTags = doc.querySelectorAll('meta');
              metaTags.forEach(meta => meta.remove());

              // Remove HTML comments
              const removeCommentsRecursive = (node: Node) => {
                const childNodes = node.childNodes;
                for (let i = childNodes.length - 1; i >= 0; i--) {
                  const child = childNodes[i];
                  if (child.nodeType === 8) { // 8 is for comment nodes
                    node.removeChild(child);
                  } else if (child.nodeType === 1) { // 1 is for element nodes
                    removeCommentsRecursive(child);
                  }
                }
              };
              removeCommentsRecursive(doc.documentElement);
            }

            // Get the processed HTML
            return doc.documentElement.outerHTML;
          },
          { html: htmlContent, clean }
        );

        // Truncate logic
        const maxLength = typeof args.maxLength === 'number' ? args.maxLength : 20000;
        let output = htmlContent;
        let truncated = false;
        if (output.length > maxLength) {
          output = output.slice(0, maxLength) + '\n<!-- Output truncated due to size limits -->';
          truncated = true;
        }

        // Add guidance footer
        const scopeInfo = selector ? ` (from "${args.selector}")` : " (entire page)";
        const cleanInfo = clean ? ", clean mode" : ", scripts removed";
        const guidance = `\n\n💡 TIP: If you need structured inspection rather than raw HTML:
   • inspect_dom() - See page structure with positions and relationships
   • query_selector("selector") - Find and inspect specific elements
   • get_computed_styles("selector") - Get CSS values for elements`;

        const finalOutput = selectionWarning
          ? `${selectionWarning.trimEnd()}\n\nHTML content${scopeInfo}${cleanInfo}:\n${output}${guidance}`
          : `HTML content${scopeInfo}${cleanInfo}:\n${output}${guidance}`;

        return createSuccessResponse(finalOutput);
      } catch (error) {
        return createErrorResponse(`Failed to get visible HTML content: ${(error as Error).message}`);
      }
    });
  }
}