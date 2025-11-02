import type { CallToolResult, TextContent, ImageContent, Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Page, Browser, APIRequestContext } from 'playwright';

// Session configuration (matches toolHandler.ts)
export interface SessionConfig {
  saveSession: boolean;
  userDataDir: string;
  screenshotsDir: string;
  headlessDefault: boolean;
}

// Context for tool execution
export interface ToolContext {
  page?: Page;
  browser?: Browser;
  apiContext?: APIRequestContext;
  server?: any;
}

// Standard response format for all tools
export interface ToolResponse extends CallToolResult {
  content: (TextContent | ImageContent)[];
  isError: boolean;
}

// Tool metadata (MCP Tool definition) with optional documentation helpers
// These extra fields are ignored by MCP clients but used by our README generator.
export interface ToolMetadata extends Tool {
  // Human-readable output description. Can be a single string or list of lines.
  outputs?: string | string[];
  // Example tool calls to showcase usage in README.
  examples?: string[];
  // Example outputs keyed by the example call.
  exampleOutputs?: { call: string; output: string }[];
  // Optional grouping hint; when absent, grouping is derived from source paths.
  category?: string;
  // Optional ordering hint: lower = earlier in lists.
  priority?: number;
}

// Interface that all tool implementations must follow
export interface ToolHandler {
  execute(args: any, context: ToolContext): Promise<ToolResponse>;
}

// Interface for tool classes with metadata
export interface ToolClass {
  new (server: any): ToolHandler;
  getMetadata(sessionConfig?: SessionConfig): ToolMetadata;
}

// Helper functions for creating responses
// Global error message sanitizer: removes stack traces and noisy engine frames
function sanitizeErrorMessage(message: string): string {
  if (!message) return '';

  // If message already contains helpful guidance (e.g., Tips), avoid truncation.
  const hasGuidance = /\bTips?:\b|💡/.test(message);

  // Trim to concise selector phrase only when there is no guidance to preserve.
  if (!hasGuidance) {
    const cutoffPhrases = [
      'is not a valid selector.',
      'is not a valid selector',
    ];
    for (const phrase of cutoffPhrases) {
      const idx = message.indexOf(phrase);
      if (idx !== -1) {
        return message.slice(0, idx + phrase.length).trim();
      }
    }
  }

  // Remove typical stack lines (e.g., " at query (...)" or " at ... (<anonymous>:x:y)")
  const lines = message.split(/\r?\n/);
  const filtered = lines.filter(l => !/^\s*at\b/.test(l) && !/<anonymous>:\d+:\d+/.test(l));
  return filtered.join('\n').trim();
}

export function createErrorResponse(message: string): ToolResponse {
  const sanitized = sanitizeErrorMessage(message);
  return {
    content: [{
      type: "text",
      text: sanitized
    }],
    isError: true
  };
}

export function createSuccessResponse(message: string | string[]): ToolResponse {
  const messages = Array.isArray(message) ? message : [message];
  return {
    content: messages.map(msg => ({
      type: "text",
      text: msg
    })),
    isError: false
  };
} 
