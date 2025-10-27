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

// Tool metadata (MCP Tool definition)
export type ToolMetadata = Tool;

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
export function createErrorResponse(message: string): ToolResponse {
  return {
    content: [{
      type: "text",
      text: message
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