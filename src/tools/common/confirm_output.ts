import type { ToolHandler, ToolContext, ToolResponse, ToolMetadata, SessionConfig } from './types.js';
import { createSuccessResponse, createErrorResponse } from './types.js';
import { consumePayload } from './confirmStore.js';

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
