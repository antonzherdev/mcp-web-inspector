import { BrowserToolBase } from "../base.js";
import type { ToolResponse, ToolContext, ToolMetadata, SessionConfig } from "../../common/types.js";

interface AncestorData {
  tagName: string;
  testId: string | null;
  classes: string;
  rect: { x: number; y: number; width: number; height: number };
  width: string;
  maxWidth: string;
  minWidth: string;
  margin: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  padding: string;
  display: string;
  overflow: string;
  overflowX: string;
  overflowY: string;
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
  border: string;
  borderTop: string;
  borderRight: string;
  borderBottom: string;
  borderLeft: string;
  flexDirection: string;
  justifyContent: string;
  alignItems: string;
  gap: string;
  gridTemplateColumns: string;
  gridTemplateRows: string;
  position: string | undefined;
  zIndex: string | undefined;
  transform: string | undefined;
}

/**
 * Tool to inspect ancestor chain of an element
 * Shows parent elements up the DOM tree with layout-critical CSS properties
 */
export class InspectAncestorsTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "inspect_ancestors",
      description: "DEBUG LAYOUT CONSTRAINTS: Walk up the DOM tree to find where width constraints, margins, borders, and overflow clipping come from. Shows for each ancestor: position/size, width constraints (w, max-w, min-w), margins with directional arrows (↑↓←→ format), padding, display type, borders (directional if non-uniform), overflow (🔒=hidden, ↕️=scroll), flexbox context (flex direction justify items gap), grid context (cols rows gap), position/z-index/transform when set. Automatically detects horizontal centering via auto margins and flags clipping points (🎯). Essential for debugging unexpected centering, constrained width, or clipped content. Default: 10 ancestors (reaches <body> in most React apps), max: 15. Use after inspect_dom() to understand parent layout constraints.",
      outputs: [
        "Header showing selected element index when selector matched multiple.",
        "For each ancestor (starting from target):",
        "- [i] <tag> | testid:... or classes",
        "- @ (x,y) width×height px",
        "- Inline summary: w, display (if not block), m/p, max-w, min-w",
        "- Flexbox/Grid context when present (direction, gap, grid templates)",
        "- Margin breakdown with arrows (↑↓←→) and centering diagnostics",
        "- Border details when set (directional if non-uniform)",
        "- Overflow state: 🔒 hidden, ↕️/↔️ scroll + overflow amount",
        "- Extra: position/z-index/transform when non-default",
        "- Diagnostics: 🎯 CLIPPING POINT / SCROLLABLE CONTAINER / WIDTH CONSTRAINT",
      ],
      examples: [
        "inspect_ancestors({ selector: 'testid:submit-button' })",
        "inspect_ancestors({ selector: '#content', limit: 15 })",
      ],
      priority: 1,
      exampleOutputs: [
        {
          call: "inspect_ancestors({ selector: 'testid:submit-button' })",
          output: `Selected: testid:submit-button (1 of 2 matches)\n\nAncestor Chain:\n\n[0] <button> | testid:submit-button\n    @ (860,540) 120x40px | w:120px display:inline-block\n    margin: ↑0px →0px ↓0px ←0px\n    border: 1px solid rgb(0, 122, 255)\n    ⚠ none\n\n[1] <div> | form-actions\n    @ (800,520) 240x80px | w:240px display:flex m:0px p:16px gap:8px\n    flex: row, justify:center, align:center, gap:8px\n    margin: →auto ←auto ← Horizontally centered (likely margin:0 auto)\n    border: none\n    overflow: 🔒 hidden\n    🎯 CLIPPING POINT - May clip overflowing children\n\n[2] <form> | #login-form\n    @ (640,200) 560x480px | w:560px max-w:600px\n    position:relative\n    🎯 WIDTH CONSTRAINT`
        }
      ],
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector or testid shorthand for the element to start from (e.g., 'testid:header', '#main')"
          },
          limit: {
            type: "number",
            description: "Maximum number of ancestors to traverse (default: 10, max: 15). Increase for deeply nested component frameworks."
          },
          elementIndex: {
            type: "number",
            description: "When selector matches multiple elements, use this 1-based index to select a specific one (e.g., 2 = second element). Default: first visible element."
          }
        },
        required: ["selector"],
      },
    };
  }

  async execute(args: {
    selector: string;
    limit?: number;
  }, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const limit = Math.min(args.limit ?? 10, 15); // Default 10, max 15
      const normalizedSelector = this.normalizeSelector(args.selector);

      // Use consistent element selection (Playwright's visibility detection)
      const locator = page.locator(normalizedSelector);
      const count = await locator.count();

      if (count === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Element not found with selector "${args.selector}"`,
            },
          ],
          isError: true,
        };
      }

      const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator, {
        originalSelector: args.selector,
      });

      // Use the selected element for ancestor traversal
      const ancestors = await element.evaluate(
        (el: Element, lim: number) => {
          const chain: any[] = [];
          let current: Element | null = el;

          for (let i = 0; i < lim && current; i++) {
            const rect = current.getBoundingClientRect();
            const computed = window.getComputedStyle(current);

            chain.push({
              tagName: current.tagName.toLowerCase(),
              testId: current.getAttribute("data-testid"),
              classes: current.className,
              rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },

              // Layout-critical properties
              width: computed.width,
              maxWidth: computed.maxWidth,
              minWidth: computed.minWidth,
              margin: computed.margin,
              marginTop: computed.marginTop,
              marginRight: computed.marginRight,
              marginBottom: computed.marginBottom,
              marginLeft: computed.marginLeft,
              padding: computed.padding,
              display: computed.display,
              overflow: computed.overflow,
              overflowX: computed.overflowX,
              overflowY: computed.overflowY,
              scrollHeight: current.scrollHeight,
              scrollWidth: current.scrollWidth,
              clientHeight: current.clientHeight,
              clientWidth: current.clientWidth,
              border: computed.border,
              borderTop: computed.borderTop,
              borderRight: computed.borderRight,
              borderBottom: computed.borderBottom,
              borderLeft: computed.borderLeft,

              // Flexbox
              flexDirection: computed.flexDirection,
              justifyContent: computed.justifyContent,
              alignItems: computed.alignItems,
              gap: computed.gap,

              // Grid
              gridTemplateColumns: computed.gridTemplateColumns,
              gridTemplateRows: computed.gridTemplateRows,

              // Conditional
              position:
                computed.position !== "static" ? computed.position : undefined,
              zIndex: computed.zIndex !== "auto" ? computed.zIndex : undefined,
              transform:
                computed.transform !== "none" ? computed.transform : undefined,
            });

            current = current.parentElement;
          }

          return chain;
        },
        limit
      );

      return {
        content: [
          {
            type: "text",
            text: this.formatAncestorChain(
              ancestors,
              args.selector,
              elementIndex,
              totalCount
            ),
          },
        ],
        isError: false,
      };
    });
  }

  private formatAncestorChain(
    ancestors: AncestorData[],
    originalSelector: string,
    elementIndex: number = 0,
    totalCount: number = 1
  ): string {
    const lines: string[] = [];

    // Header with selector info
    const selectionInfo = this.formatElementSelectionInfo(
      originalSelector,
      elementIndex,
      totalCount,
      true
    );

    if (selectionInfo) {
      lines.push(selectionInfo.replace(/\n\n$/, '')); // Remove trailing newlines for header
      lines.push(`Ancestor Chain:\n`);
    } else {
      lines.push(`Ancestor Chain: ${originalSelector}\n`);
    }

    ancestors.forEach((ancestor, index) => {
      const parts: string[] = [];

      // Tag and identifier
      let identifier = `[${index}] <${ancestor.tagName}>`;
      if (ancestor.testId) {
        identifier += ` | testid:${ancestor.testId}`;
      } else if (ancestor.classes) {
        // Show first few classes for context
        const classes = ancestor.classes.trim().split(/\s+/).slice(0, 3);
        if (classes.length > 0 && classes[0]) {
          identifier += ` | ${classes.join(" ")}`;
        }
      }
      parts.push(identifier);

      // Position and size (always show)
      const layoutInfo: string[] = [];
      parts.push(
        `\n    @ (${ancestor.rect.x},${ancestor.rect.y}) ${ancestor.rect.width}x${ancestor.rect.height}px`
      );

      // Width info (always show)
      layoutInfo.push(`w:${ancestor.width}`);

      // Display (only if not block)
      if (ancestor.display !== "block") {
        layoutInfo.push(`display:${ancestor.display}`);
      }

      // Only show non-default values
      if (ancestor.margin !== "0px") {
        layoutInfo.push(`m:${ancestor.margin}`);
      }
      if (ancestor.padding !== "0px") {
        layoutInfo.push(`p:${ancestor.padding}`);
      }
      if (ancestor.maxWidth !== "none") {
        layoutInfo.push(`max-w:${ancestor.maxWidth}`);
      }
      if (ancestor.minWidth !== "0px") {
        layoutInfo.push(`min-w:${ancestor.minWidth}`);
      }

      if (layoutInfo.length > 0) {
        parts.push(` | ${layoutInfo.join(" ")}`);
      }

      // Flexbox/Grid context (on separate line for clarity)
      const layoutContext = this.formatLayoutContext(ancestor);
      if (layoutContext) {
        parts.push(`\n    ${layoutContext}`);
      }

      // Margin details (only if non-zero or has auto)
      const marginDetails = this.formatMarginDetails(ancestor);
      if (marginDetails) {
        parts.push(`\n    ${marginDetails}`);
      }

      // Border - only if set
      const borderInfo = this.formatBorder(ancestor);
      if (borderInfo) {
        parts.push(`\n    ${borderInfo}`);
      }

      // Overflow - only if not visible
      const overflowInfo = this.formatOverflow(ancestor);
      if (overflowInfo) {
        parts.push(`\n    ${overflowInfo}`);
      }

      // Position, z-index, transform (only if set)
      const extraInfo: string[] = [];
      if (ancestor.position) {
        extraInfo.push(`position:${ancestor.position}`);
      }
      if (ancestor.zIndex) {
        extraInfo.push(`z-index:${ancestor.zIndex}`);
      }
      if (ancestor.transform) {
        extraInfo.push(`transform:${ancestor.transform}`);
      }
      if (extraInfo.length > 0) {
        parts.push(`\n    ${extraInfo.join(", ")}`);
      }

      // Add diagnostics
      const diagnostics = this.generateDiagnostics(ancestor, index);
      if (diagnostics) {
        parts.push(`\n    ${diagnostics}`);
      }

      lines.push(parts.join(""));
    });

    return lines.join("\n\n");
  }

  private formatBorder(ancestor: AncestorData): string | null {
    // Check if main border is set
    if (
      ancestor.border &&
      ancestor.border !== "none" &&
      ancestor.border !== "0px none" &&
      !ancestor.border.startsWith("0px")
    ) {
      return `border: ${ancestor.border}`;
    }

    // Check directional borders
    const borders: string[] = [];
    if (
      ancestor.borderTop &&
      ancestor.borderTop !== "none" &&
      !ancestor.borderTop.startsWith("0px")
    ) {
      borders.push(`top:${ancestor.borderTop}`);
    }
    if (
      ancestor.borderRight &&
      ancestor.borderRight !== "none" &&
      !ancestor.borderRight.startsWith("0px")
    ) {
      borders.push(`right:${ancestor.borderRight}`);
    }
    if (
      ancestor.borderBottom &&
      ancestor.borderBottom !== "none" &&
      !ancestor.borderBottom.startsWith("0px")
    ) {
      borders.push(`bottom:${ancestor.borderBottom}`);
    }
    if (
      ancestor.borderLeft &&
      ancestor.borderLeft !== "none" &&
      !ancestor.borderLeft.startsWith("0px")
    ) {
      borders.push(`left:${ancestor.borderLeft}`);
    }

    if (borders.length > 0) {
      return `border: ${borders.join(", ")}`;
    }

    return null;
  }

  private formatOverflow(ancestor: AncestorData): string | null {
    const parts: string[] = [];

    // Detect actual scrollable content
    const hasVerticalScroll = ancestor.scrollHeight > ancestor.clientHeight;
    const hasHorizontalScroll = ancestor.scrollWidth > ancestor.clientWidth;
    const verticalOverflow = hasVerticalScroll ? ancestor.scrollHeight - ancestor.clientHeight : 0;
    const horizontalOverflow = hasHorizontalScroll ? ancestor.scrollWidth - ancestor.clientWidth : 0;

    // Check if overflow CSS is set
    const hasOverflowX = ancestor.overflowX !== "visible";
    const hasOverflowY = ancestor.overflowY !== "visible";

    // Only show if there's either CSS overflow set OR actual scrollable content
    if (!hasOverflowX && !hasOverflowY && !hasVerticalScroll && !hasHorizontalScroll) {
      return null;
    }

    // Handle uniform overflow
    if (
      ancestor.overflow !== "visible" &&
      ancestor.overflowX === ancestor.overflow &&
      ancestor.overflowY === ancestor.overflow
    ) {
      let icon = "";
      let scrollInfo = "";

      if (ancestor.overflow === "hidden") {
        icon = "🔒";
        if (hasVerticalScroll || hasHorizontalScroll) {
          const clippedParts: string[] = [];
          if (hasVerticalScroll) clippedParts.push(`↕️ ${verticalOverflow}px clipped`);
          if (hasHorizontalScroll) clippedParts.push(`↔️ ${horizontalOverflow}px clipped`);
          scrollInfo = ` (${clippedParts.join(', ')})`;
        }
      } else if (ancestor.overflow === "auto" || ancestor.overflow === "scroll") {
        const scrollParts: string[] = [];
        if (hasVerticalScroll) {
          icon = "↕️";
          scrollParts.push(`↕️ ${verticalOverflow}px`);
        }
        if (hasHorizontalScroll) {
          icon = hasVerticalScroll ? "↕️↔️" : "↔️";
          scrollParts.push(`↔️ ${horizontalOverflow}px`);
        }
        if (scrollParts.length > 0) {
          scrollInfo = ` (${scrollParts.join(', ')} scrollable)`;
        } else if (ancestor.overflow === "scroll") {
          scrollInfo = " (no overflow)";
        }
      }

      return `overflow: ${icon} ${ancestor.overflow}${scrollInfo}`;
    }

    // Handle different overflow-x/y
    if (hasOverflowX || hasOverflowY || hasVerticalScroll || hasHorizontalScroll) {
      const overflowParts: string[] = [];

      if (hasOverflowY || hasVerticalScroll) {
        let yIcon = "";
        let yInfo = "";

        if (ancestor.overflowY === "hidden") {
          yIcon = "🔒";
          if (hasVerticalScroll) {
            yInfo = ` (${verticalOverflow}px clipped)`;
          }
        } else if (ancestor.overflowY === "auto" || ancestor.overflowY === "scroll") {
          if (hasVerticalScroll) {
            yIcon = "↕️";
            yInfo = ` (${verticalOverflow}px scrollable)`;
          } else if (ancestor.overflowY === "scroll") {
            yIcon = "↕️";
            yInfo = " (no overflow)";
          }
        }

        overflowParts.push(`overflow-y: ${yIcon} ${ancestor.overflowY}${yInfo}`);
      }

      if (hasOverflowX || hasHorizontalScroll) {
        let xIcon = "";
        let xInfo = "";

        if (ancestor.overflowX === "hidden") {
          xIcon = "🔒";
          if (hasHorizontalScroll) {
            xInfo = ` (${horizontalOverflow}px clipped)`;
          }
        } else if (ancestor.overflowX === "auto" || ancestor.overflowX === "scroll") {
          if (hasHorizontalScroll) {
            xIcon = "↔️";
            xInfo = ` (${horizontalOverflow}px scrollable)`;
          } else if (ancestor.overflowX === "scroll") {
            xIcon = "↔️";
            xInfo = " (no overflow)";
          }
        }

        overflowParts.push(`overflow-x: ${xIcon} ${ancestor.overflowX}${xInfo}`);
      }

      return overflowParts.join(", ");
    }

    return null;
  }

  private formatLayoutContext(ancestor: AncestorData): string | null {
    const parts: string[] = [];

    // Flexbox
    if (ancestor.display === "flex" || ancestor.display === "inline-flex") {
      const flexParts = ["flex"];

      if (ancestor.flexDirection && ancestor.flexDirection !== "row") {
        flexParts.push(ancestor.flexDirection);
      }

      if (ancestor.justifyContent && ancestor.justifyContent !== "normal" && ancestor.justifyContent !== "flex-start") {
        flexParts.push(`justify:${ancestor.justifyContent}`);
      }

      if (ancestor.alignItems && ancestor.alignItems !== "normal" && ancestor.alignItems !== "stretch") {
        flexParts.push(`items:${ancestor.alignItems}`);
      }

      if (ancestor.gap && ancestor.gap !== "0px" && ancestor.gap !== "normal") {
        flexParts.push(`gap:${ancestor.gap}`);
      }

      parts.push(flexParts.join(" "));
    }

    // Grid
    if (ancestor.display === "grid" || ancestor.display === "inline-grid") {
      const gridParts = ["grid"];

      if (ancestor.gridTemplateColumns && ancestor.gridTemplateColumns !== "none") {
        gridParts.push(`cols:${ancestor.gridTemplateColumns}`);
      }

      if (ancestor.gridTemplateRows && ancestor.gridTemplateRows !== "none") {
        gridParts.push(`rows:${ancestor.gridTemplateRows}`);
      }

      if (ancestor.gap && ancestor.gap !== "0px" && ancestor.gap !== "normal") {
        gridParts.push(`gap:${ancestor.gap}`);
      }

      parts.push(gridParts.join(" "));
    }

    return parts.length > 0 ? parts.join(" | ") : null;
  }

  private formatMarginDetails(ancestor: AncestorData): string | null {
    // Check if any margin is "auto" (CSS value)
    // Note: computed styles show actual values, not "auto"
    const hasAuto = ancestor.margin.includes("auto") ||
                     ancestor.marginTop === "auto" ||
                     ancestor.marginRight === "auto" ||
                     ancestor.marginBottom === "auto" ||
                     ancestor.marginLeft === "auto";

    // Check if margins are non-uniform (can't be represented by shorthand)
    const isNonUniform = ancestor.marginTop !== ancestor.marginBottom ||
                         ancestor.marginLeft !== ancestor.marginRight ||
                         ancestor.marginTop !== ancestor.marginLeft;

    // Parse margin values to detect large symmetric margins (likely auto-centered)
    const parseMarginValue = (val: string): number => {
      const match = val.match(/^([\d.]+)px$/);
      return match ? parseFloat(match[1]) : 0;
    };

    const marginLeftPx = parseMarginValue(ancestor.marginLeft);
    const marginRightPx = parseMarginValue(ancestor.marginRight);
    const marginTopPx = parseMarginValue(ancestor.marginTop);
    const marginBottomPx = parseMarginValue(ancestor.marginBottom);

    // Detect horizontal centering: large equal left/right margins, small top/bottom
    const isHorizontallyCentered =
      marginLeftPx > 100 &&
      marginRightPx > 100 &&
      Math.abs(marginLeftPx - marginRightPx) < 2 && // Allow 1px rounding
      marginTopPx === 0 &&
      marginBottomPx === 0;

    if (!hasAuto && !isHorizontallyCentered && ancestor.margin === "0px") {
      return null; // All zeros, skip
    }

    // If has auto, always show detailed breakdown with arrows
    if (hasAuto) {
      const parts: string[] = [];

      if (ancestor.marginTop !== "0px") {
        parts.push(`↑${ancestor.marginTop}`);
      }
      if (ancestor.marginRight === "auto" || ancestor.marginRight !== "0px") {
        parts.push(`→${ancestor.marginRight}`);
      }
      if (ancestor.marginBottom !== "0px") {
        parts.push(`↓${ancestor.marginBottom}`);
      }
      if (ancestor.marginLeft === "auto" || ancestor.marginLeft !== "0px") {
        parts.push(`←${ancestor.marginLeft}`);
      }

      const marginStr = `margin: ${parts.join(" ")}`;

      // Add diagnostic if horizontally centered
      if (ancestor.marginLeft === "auto" && ancestor.marginRight === "auto") {
        return `${marginStr} ← Horizontally centered by auto margins`;
      }

      return marginStr;
    }

    // Show horizontal centering diagnostic
    if (isHorizontallyCentered) {
      return `margin: →${ancestor.marginRight} ←${ancestor.marginLeft} ← Horizontally centered (likely margin:0 auto)`;
    }

    // If non-uniform and non-zero, show with arrows
    if (isNonUniform && ancestor.margin !== "0px") {
      const parts: string[] = [];

      if (ancestor.marginTop !== "0px") {
        parts.push(`↑${ancestor.marginTop}`);
      }
      if (ancestor.marginRight !== "0px") {
        parts.push(`→${ancestor.marginRight}`);
      }
      if (ancestor.marginBottom !== "0px") {
        parts.push(`↓${ancestor.marginBottom}`);
      }
      if (ancestor.marginLeft !== "0px") {
        parts.push(`←${ancestor.marginLeft}`);
      }

      return `margin: ${parts.join(" ")}`;
    }

    return null;
  }

  private generateDiagnostics(
    ancestor: AncestorData,
    index: number
  ): string | null {
    const diagnostics: string[] = [];

    // Detect actual scrollable content
    const hasVerticalScroll = ancestor.scrollHeight > ancestor.clientHeight;
    const hasHorizontalScroll = ancestor.scrollWidth > ancestor.clientWidth;

    // Overflow hidden warning
    if (ancestor.overflow === "hidden" || ancestor.overflowY === "hidden") {
      diagnostics.push("🎯 CLIPPING POINT - May clip overflowing children");
    }

    // Scrollable container detection
    if (hasVerticalScroll || hasHorizontalScroll) {
      const scrollParts: string[] = [];
      if (hasVerticalScroll) scrollParts.push("vertically");
      if (hasHorizontalScroll) scrollParts.push("horizontally");
      diagnostics.push(`🎯 SCROLLABLE CONTAINER - ${scrollParts.join(" & ")}`);
    }

    // Width constraint detection
    if (ancestor.maxWidth !== "none" && index > 0) {
      diagnostics.push("🎯 WIDTH CONSTRAINT");
    }

    return diagnostics.length > 0 ? diagnostics.join("\n    ") : null;
  }
}
