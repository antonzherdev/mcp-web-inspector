import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { toolRegistry } from './tools/common/registry.js';
import './tools/browser/register.js'; // Auto-registers all tools

export interface SessionConfig {
  saveSession: boolean;
  userDataDir: string;
  screenshotsDir: string;
  headlessDefault: boolean;
}

/**
 * Create tool definitions from the registry
 */
export function createToolDefinitions(sessionConfig?: SessionConfig): Tool[] {
  return toolRegistry.getToolDefinitions(sessionConfig);
}

// Export tool list from constants file (to avoid circular dependencies)
import { BROWSER_TOOLS } from './toolConstants.js';
export { BROWSER_TOOLS };
export const tools = BROWSER_TOOLS;
