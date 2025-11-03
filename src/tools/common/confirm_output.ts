import type { ToolHandler, ToolContext, ToolResponse, ToolMetadata, SessionConfig } from './types.js';
import { createSuccessResponse, createErrorResponse } from './types.js';
import { consumePayload, registerPayload } from './confirmStore.js';

// Preview helpers (moved here from confirmHelpers.ts for easier discovery)
export interface PreviewCounts {
  totalLength?: number;
  shownLength?: number;
  totalMatched?: number;
  shownCount?: number;
  truncated?: boolean;
}

export function makeConfirmPreview(
  payload: string,
  options: {
    headerLine?: string;
    previewLines: string[]; // include your own 'Preview ...' label line(s)
    counts?: PreviewCounts;
    extraTips?: string[];
  }
): { token: string; lines: string[] } {
  const token = registerPayload(payload);
  const lines: string[] = [];

  if (options.headerLine) {
    lines.push(options.headerLine);
  }

  const parts: string[] = [];
  const c = options.counts || {};
  if (typeof c.totalLength === 'number') parts.push(`totalLength=${c.totalLength}`);
  if (typeof c.shownLength === 'number') parts.push(`shownLength=${c.shownLength}`);
  if (typeof c.totalMatched === 'number') parts.push(`totalMatched=${c.totalMatched}`);
  if (typeof c.shownCount === 'number') parts.push(`shownCount=${c.shownCount}`);
  if (typeof c.truncated === 'boolean') parts.push(`truncated=${c.truncated}`);
  if (parts.length) {
    lines.push(`counts: ${parts.join(', ')}`);
  }

  if (lines.length) lines.push('');

  // Caller provides preview content lines (e.g., label + excerpt or list)
  for (const l of options.previewLines) lines.push(l);

  if (options.previewLines.length) lines.push('');

  const estTokens = Math.round((typeof c.totalLength === 'number' ? c.totalLength : payload.length) / 3);
  lines.push(
    `Output is large (~${estTokens} tokens). To fetch full content without resending parameters, call confirm_output({ token: "${token}" }).`
  );

  if (options.extraTips && options.extraTips.length) {
    for (const tip of options.extraTips) lines.push(tip);
  }

  return { token, lines };
}

export class ConfirmOutputTool implements ToolHandler {
  constructor(private server: any) {}

  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: 'confirm_output',
      description: "Return full output for a previously previewed large result using a one-time token. Use when a tool responded with a preview + token. Safer than resending original parameters.",
      outputs: [
        "Full original payload if token is valid (one-time)",
        "Error: 'Invalid or expired token'",
      ],
      inputSchema: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: "One-time token obtained from a tool's preview response",
          },
        },
        required: ['token'],
      },
      priority: 2,
      category: 'Other',
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    const token = typeof args.token === 'string' ? args.token : '';
    if (!token) return createErrorResponse('Token is required');

    const res = consumePayload(token);
    if (!res.ok) {
      const err = (res as { ok: false; error: string }).error;
      return createErrorResponse(err);
    }

    return createSuccessResponse(res.payload);
  }
}
