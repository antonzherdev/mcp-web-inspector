import { ToolHandler, ToolMetadata, SessionConfig } from '../../common/types.js';
import { BrowserToolBase } from '../base.js';
import type { ToolContext, ToolResponse } from '../../common/types.js';

export interface GetComputedStylesArgs {
  selector: string;
  properties?: string;
  elementIndex?: number;  // Optional 1-based index to select specific element when multiple match
}

export class GetComputedStylesTool extends BrowserToolBase implements ToolHandler {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "get_computed_styles",
      description: "INSPECT CSS PROPERTIES: Get computed CSS values for specific properties (display, position, width, etc.). Use when you need raw CSS values or specific properties not shown by measure_element(). Returns styles grouped by category (Layout, Visibility, Spacing, Typography). For box model visualization (padding/margin), use measure_element() instead.",
      outputs: [
        "Optional selection header when multiple elements matched.",
        "Header: 'Computed Styles: <tag id/class/testid>'",
        "One or more sections: Layout, Visibility, Spacing, Typography, Other",
        "Each section lists 'property: value' lines for requested properties",
      ],
      examples: [
        "get_computed_styles({ selector: 'testid:login-form' })",
        "get_computed_styles({ selector: '#hero', properties: 'display,width,color' })",
      ],
      priority: 3,
      exampleOutputs: [
        {
          call: "get_computed_styles({ selector: 'testid:login-form' })",
          output: `⚠ Warning: Selector matched 2 elements, showing 1 (use elementIndex to target a specific one)\n\nComputed Styles: <form data-testid=\"login-form\">\n\nLayout:\n  display: block\n  position: static\n  width: 560px\n  height: 480px\n\nVisibility:\n  opacity: 1\n  visibility: visible\n  z-index: auto\n  overflow: visible\n\nSpacing:\n  margin: 0px\n  padding: 24px\n\nTypography:\n  font-size: 16px\n  font-weight: 400\n  color: rgb(33, 37, 41)`
        }
      ],
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand (e.g., 'testid:submit-button', '#main')"
          },
          properties: {
            type: "string",
            description: "Comma-separated list of CSS properties to retrieve (e.g., 'display,width,color'). If not specified, returns common layout properties: display, position, width, height, opacity, visibility, z-index, overflow, margin, padding, font-size, font-weight, color, background-color"
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

      // Use standard element selection with visibility preference
      const locator = page.locator(normalizedSelector);
      const { element, elementIndex, totalCount } = await this.selectPreferredLocator(locator, {
        elementIndex: args.elementIndex,
        originalSelector: args.selector,
      });

      // Format selection warning if multiple elements matched
      const warning = this.formatElementSelectionInfo(
        args.selector,
        elementIndex,
        totalCount
      );

      // Get element tag and selector info
      const elementInfo = await element.evaluate((el) => {
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
      const styles = await element.evaluate((el, props) => {
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
