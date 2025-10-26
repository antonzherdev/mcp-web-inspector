import { BrowserToolBase } from "./base.js";
import type { ToolResponse, ToolContext } from "../common/types.js";

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
  async execute(args: {
    selector: string;
    limit?: number;
  }, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const limit = Math.min(args.limit ?? 10, 15); // Default 10, max 15
      const normalizedSelector = this.normalizeSelector(args.selector);

      const ancestors = await page.evaluate(
        ({ sel, lim }) => {
          const element = document.querySelector(sel);
          if (!element) {
            return null;
          }

          const chain: any[] = [];
          let current: Element | null = element;

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
        { sel: normalizedSelector, lim: limit }
      );

      if (!ancestors) {
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

      return {
        content: [
          {
            type: "text",
            text: this.formatAncestorChain(ancestors, args.selector),
          },
        ],
        isError: false,
      };
    });
  }

  private formatAncestorChain(
    ancestors: AncestorData[],
    originalSelector: string
  ): string {
    const lines: string[] = [`Ancestor Chain: ${originalSelector}\n`];

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

    // Handle uniform overflow
    if (
      ancestor.overflow !== "visible" &&
      ancestor.overflowX === ancestor.overflow &&
      ancestor.overflowY === ancestor.overflow
    ) {
      const icon =
        ancestor.overflow === "hidden"
          ? "🔒"
          : ancestor.overflow === "auto" || ancestor.overflow === "scroll"
          ? "↕️"
          : "";
      return `overflow: ${icon} ${ancestor.overflow}`;
    }

    // Handle different overflow-x/y
    if (
      ancestor.overflowX !== "visible" ||
      ancestor.overflowY !== "visible"
    ) {
      const xIcon =
        ancestor.overflowX === "hidden"
          ? "🔒"
          : ancestor.overflowX === "auto" || ancestor.overflowX === "scroll"
          ? "↔️"
          : "";
      const yIcon =
        ancestor.overflowY === "hidden"
          ? "🔒"
          : ancestor.overflowY === "auto" || ancestor.overflowY === "scroll"
          ? "↕️"
          : "";

      parts.push(
        `overflow-x: ${xIcon} ${ancestor.overflowX}, overflow-y: ${yIcon} ${ancestor.overflowY}`
      );
      return parts.join(", ");
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

    // Overflow hidden warning
    if (ancestor.overflow === "hidden" || ancestor.overflowY === "hidden") {
      diagnostics.push("🎯 CLIPPING POINT - May clip overflowing children");
    }

    // Width constraint detection
    if (ancestor.maxWidth !== "none" && index > 0) {
      diagnostics.push("🎯 WIDTH CONSTRAINT");
    }

    return diagnostics.length > 0 ? diagnostics.join("\n    ") : null;
  }
}
