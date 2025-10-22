import { ToolHandler } from '../common/types.js';
import { BrowserToolBase } from './base.js';
import type { ToolContext, ToolResponse } from '../common/types.js';

export interface MeasureElementArgs {
  selector: string;
}

export class MeasureElementTool extends BrowserToolBase implements ToolHandler {
  async execute(args: MeasureElementArgs, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const normalizedSelector = this.normalizeSelector(args.selector);

      // Find the element
      const locator = page.locator(normalizedSelector);
      const count = await locator.count();

      if (count === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `✗ Element not found: ${args.selector}`
            }
          ],
          isError: true
        };
      }

      // Handle multiple matches by using first() - show warning (consistent with other tools)
      const targetLocator = count > 1 ? locator.first() : locator;

      let warning = '';
      if (count > 1) {
        warning = `⚠ Warning: Selector matched ${count} elements, using first\n\n`;
      }

      // Get element descriptor
      const elementInfo = await targetLocator.evaluate((el) => {
        const tag = el.tagName.toLowerCase();
        const testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-cy');
        const id = el.id ? `#${el.id}` : '';
        const classes = el.className && typeof el.className === 'string'
          ? `.${el.className.split(' ').filter(c => c).slice(0, 2).join('.')}`
          : '';

        let descriptor = `<${tag}`;
        if (testId) descriptor += ` data-testid="${testId}"`;
        else if (id) descriptor += id;
        else if (classes) descriptor += classes;
        descriptor += '>';

        return { descriptor };
      });

      // Get box model measurements
      const measurements = await targetLocator.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const parseValue = (val: string): number => parseFloat(val) || 0;

        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: parseValue(computed.width),
          height: parseValue(computed.height),
          marginTop: parseValue(computed.marginTop),
          marginRight: parseValue(computed.marginRight),
          marginBottom: parseValue(computed.marginBottom),
          marginLeft: parseValue(computed.marginLeft),
          paddingTop: parseValue(computed.paddingTop),
          paddingRight: parseValue(computed.paddingRight),
          paddingBottom: parseValue(computed.paddingBottom),
          paddingLeft: parseValue(computed.paddingLeft),
          borderTopWidth: parseValue(computed.borderTopWidth),
          borderRightWidth: parseValue(computed.borderRightWidth),
          borderBottomWidth: parseValue(computed.borderBottomWidth),
          borderLeftWidth: parseValue(computed.borderLeftWidth),
          borderStyle: computed.borderStyle,
          borderColor: computed.borderColor
        };
      });

      // Calculate dimensions
      const contentWidth = Math.round(measurements.width - measurements.paddingLeft - measurements.paddingRight);
      const contentHeight = Math.round(measurements.height - measurements.paddingTop - measurements.paddingBottom);
      const boxWidth = Math.round(measurements.width);
      const boxHeight = Math.round(measurements.height);
      const totalWidth = Math.round(boxWidth + measurements.marginLeft + measurements.marginRight);
      const totalHeight = Math.round(boxHeight + measurements.marginTop + measurements.marginBottom);

      // Format border info
      const formatBorder = (): string => {
        const { borderTopWidth: top, borderRightWidth: right, borderBottomWidth: bottom, borderLeftWidth: left, borderStyle: style } = measurements;

        // Check if all sides are the same
        if (top === right && right === bottom && bottom === left) {
          if (top === 0) return '  Border:  none';
          return `  Border:  ${top}px ${style}`;
        }

        // Different sides
        const lines: string[] = [];
        if (top > 0) lines.push(`↑${top}px`);
        if (right > 0) lines.push(`→${right}px`);
        if (bottom > 0) lines.push(`↓${bottom}px`);
        if (left > 0) lines.push(`←${left}px`);

        return lines.length > 0
          ? `  Border:  ${lines.join(' ')} ${style}`
          : '  Border:  none';
      };

      // Format spacing (margin/padding) with directional arrows
      const formatSpacing = (top: number, right: number, bottom: number, left: number): string => {
        const parts: string[] = [];
        if (top > 0) parts.push(`↑${Math.round(top)}px`);
        if (bottom > 0) parts.push(`↓${Math.round(bottom)}px`);
        if (left > 0) parts.push(`←${Math.round(left)}px`);
        if (right > 0) parts.push(`→${Math.round(right)}px`);
        return parts.length > 0 ? parts.join(' ') : '0px';
      };

      // Build output in compact text format
      const sections: string[] = [];

      if (warning) {
        sections.push(warning.trim());
      }

      sections.push(`Element: ${elementInfo.descriptor}`);
      sections.push(`@ (${measurements.x},${measurements.y}) ${boxWidth}x${boxHeight}px`);
      sections.push('');
      sections.push('Box Model:');
      sections.push(`  Content: ${contentWidth}x${contentHeight}px`);
      sections.push(`  Padding: ${formatSpacing(measurements.paddingTop, measurements.paddingRight, measurements.paddingBottom, measurements.paddingLeft)}`);
      sections.push(formatBorder());
      sections.push(`  Margin:  ${formatSpacing(measurements.marginTop, measurements.marginRight, measurements.marginBottom, measurements.marginLeft)}`);
      sections.push('');
      sections.push(`Total Space: ${totalWidth}x${totalHeight}px (with margin)`);

      // Detect unusual spacing and suggest inspect_ancestors
      const hasUnusualMargins = measurements.marginLeft > 100 || measurements.marginRight > 100;
      const isWidthConstrained = boxWidth < 800 && (measurements.marginLeft + measurements.marginRight) > 200;

      if (hasUnusualMargins || isWidthConstrained) {
        sections.push('');
        sections.push('💡 Unexpected spacing/width detected. Check parent constraints:');
        sections.push(`   inspect_ancestors({ selector: "${args.selector}" })`);
      }

      return {
        content: [
          {
            type: 'text',
            text: sections.join('\n')
          }
        ],
        isError: false
      };
    });
  }
}
