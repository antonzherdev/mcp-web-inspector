import { ToolHandler } from '../common/types.js';
import { BrowserToolBase } from './base.js';
import type { ToolContext, ToolResponse } from '../common/types.js';

export interface GetComputedStylesArgs {
  selector: string;
  properties?: string;
}

export class GetComputedStylesTool extends BrowserToolBase implements ToolHandler {
  private readonly DEFAULT_PROPERTIES = [
    'display', 'position', 'width', 'height',
    'opacity', 'visibility', 'z-index', 'overflow',
    'margin', 'padding',
    'font-size', 'font-weight', 'color', 'background-color'
  ];

  async execute(args: GetComputedStylesArgs, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const normalizedSelector = this.normalizeSelector(args.selector);

      // Parse properties parameter
      const properties = args.properties
        ? args.properties.split(',').map(p => p.trim())
        : this.DEFAULT_PROPERTIES;

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

      // Handle multiple matches by using first() - show warning (consistent with compare_positions)
      const targetLocator = count > 1 ? locator.first() : locator;

      let warning = '';
      if (count > 1) {
        warning = `⚠ Warning: Selector matched ${count} elements, using first\n\n`;
      }

      // Get element tag and selector info
      const elementInfo = await targetLocator.evaluate((el) => {
        const attrs: string[] = [];
        const tag = el.tagName.toLowerCase();
        if (el.id) attrs.push(`#${el.id}`);
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c).slice(0, 2);
          if (classes.length) attrs.push(`.${classes.join('.')}`);
        }
        const testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-cy');
        if (testId) attrs.push(`data-testid="${testId}"`);

        return {
          tag,
          display: attrs.length ? `<${tag} ${attrs.join(' ')}>` : `<${tag}>`
        };
      });

      // Get computed styles
      const styles = await targetLocator.evaluate((el, props) => {
        const computed = window.getComputedStyle(el);
        const result: Record<string, string> = {};
        props.forEach((prop: string) => {
          result[prop] = computed.getPropertyValue(prop);
        });
        return result;
      }, properties);

      // Group styles by category
      const layout: string[] = [];
      const visibility: string[] = [];
      const spacing: string[] = [];
      const typography: string[] = [];
      const other: string[] = [];

      const layoutProps = ['display', 'position', 'width', 'height', 'top', 'left', 'right', 'bottom'];
      const visibilityProps = ['opacity', 'visibility', 'z-index', 'overflow', 'overflow-x', 'overflow-y'];
      const spacingProps = ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                            'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'];
      const typographyProps = ['font-size', 'font-weight', 'font-family', 'color', 'line-height', 'text-align'];

      Object.entries(styles).forEach(([prop, value]) => {
        const line = `  ${prop}: ${value}`;
        if (layoutProps.includes(prop)) {
          layout.push(line);
        } else if (visibilityProps.includes(prop)) {
          visibility.push(line);
        } else if (spacingProps.includes(prop)) {
          spacing.push(line);
        } else if (typographyProps.includes(prop)) {
          typography.push(line);
        } else {
          other.push(line);
        }
      });

      // Build output
      const sections: string[] = [];

      if (warning) {
        sections.push(warning.trim());
      }

      sections.push(`Computed Styles: ${elementInfo.display}\n`);

      if (layout.length) {
        sections.push('Layout:\n' + layout.join('\n'));
      }
      if (visibility.length) {
        sections.push('Visibility:\n' + visibility.join('\n'));
      }
      if (spacing.length) {
        sections.push('Spacing:\n' + spacing.join('\n'));
      }
      if (typography.length) {
        sections.push('Typography:\n' + typography.join('\n'));
      }
      if (other.length) {
        sections.push('Other:\n' + other.join('\n'));
      }

      return {
        content: [
          {
            type: 'text',
            text: sections.join('\n\n')
          }
        ],
        isError: false
      };
    });
  }
}
