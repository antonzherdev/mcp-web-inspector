import type { ToolClass, ToolMetadata, SessionConfig, ToolHandler } from './types.js';
import { createErrorResponse } from './types.js';
import { BrowserToolBase } from '../browser/base.js';
import { BROWSER_TOOL_CLASSES } from '../browser/register.js';

const toolClasses = new Map<string, ToolClass>();
const toolInstances = new Map<string, ToolHandler>();
const browserToolNames = new Set<string>();

function registerTool(toolClass: ToolClass): void {
  const metadata = toolClass.getMetadata();
  toolClasses.set(metadata.name, toolClass);
  if (toolClass.prototype instanceof BrowserToolBase) {
    browserToolNames.add(metadata.name);
  }
}

export function registerTools(toolClassList: ToolClass[]): void {
  for (const toolClass of toolClassList) {
    registerTool(toolClass);
  }
}

export function getToolInstance(name: string, server: any): ToolHandler | null {
  const toolClass = toolClasses.get(name);
  if (!toolClass) {
    return null;
  }

  if (!toolInstances.has(name)) {
    toolInstances.set(name, new toolClass(server));
  }

  return toolInstances.get(name)!;
}

export async function executeTool(name: string, args: any, context: any, server: any) {
  const instance = getToolInstance(name, server);
  if (!instance) {
    return createErrorResponse(`Unknown tool: ${name}`);
  }

  return await instance.execute(args, context);
}

export function createToolDefinitions(sessionConfig?: SessionConfig): ToolMetadata[] {
  return Array.from(toolClasses.values()).map(toolClass =>
    toolClass.getMetadata(sessionConfig)
  );
}

export function getBrowserToolNames(): string[] {
  return Array.from(browserToolNames);
}

export function isBrowserTool(name: string): boolean {
  return browserToolNames.has(name);
}

export function clearToolInstances(): void {
  toolInstances.clear();
}

registerTools(BROWSER_TOOL_CLASSES);
