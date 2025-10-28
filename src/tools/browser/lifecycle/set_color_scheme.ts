import { BrowserToolBase } from '../base.js';
import {
  createErrorResponse,
  createSuccessResponse,
  ToolContext,
  ToolMetadata,
  ToolResponse,
  SessionConfig,
} from '../../common/types.js';

type SchemeInput = 'dark' | 'light' | 'system' | 'no-preference';

function normalizeScheme(rawValue: unknown): SchemeInput | null {
  if (typeof rawValue !== 'string') {
    return null;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (
    normalized === 'dark' ||
    normalized === 'light' ||
    normalized === 'system' ||
    normalized === 'no-preference'
  ) {
    return normalized;
  }

  return null;
}

/**
 * Tool for setting prefers-color-scheme emulation
 */
export class SetColorSchemeTool extends BrowserToolBase {
  static getMetadata(_sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "set_color_scheme",
      description: "Set the browser color scheme that controls CSS prefers-color-scheme. Defaults to system appearance. Use before inspecting colors or taking screenshots. Options: system (clear override to follow OS/browser setting), dark, light, no-preference (simulate agents with no declared preference). Returns confirmation of the active scheme.",
      inputSchema: {
        type: "object",
        properties: {
          scheme: {
            type: "string",
            description: "Color scheme to emulate: 'system', 'dark', 'light', or 'no-preference'. Example: { scheme: 'dark' }",
          },
        },
        required: ["scheme"],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    const schemeInput = normalizeScheme(args.scheme);
    if (!schemeInput) {
      return createErrorResponse(
        `Invalid scheme "${args.scheme}". Use one of: system, dark, light, no-preference.`
      );
    }

    return this.safeExecute(context, async () => {
      const { setColorSchemeOverride, getColorSchemeOverride } = await import('../../../toolHandler.js');

      const override =
        schemeInput === 'system'
          ? null
          : (schemeInput as Exclude<SchemeInput, 'system'>);

      await setColorSchemeOverride(override);

      const active = getColorSchemeOverride();
      const label = active ?? 'system';

      return createSuccessResponse(
        `Color scheme set to ${label}.`
      );
    });
  }
}
