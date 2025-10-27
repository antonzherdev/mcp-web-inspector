import type { ToolClass, ToolMetadata, SessionConfig } from './types.js';

/**
 * Tool Registry - manages all available tools and routes execution
 * Eliminates the need for manual switch statements
 */
export class ToolRegistry {
  private tools = new Map<string, ToolClass>();
  private instances = new Map<string, any>();

  /**
   * Register a tool class
   */
  register(toolClass: ToolClass): void {
    const metadata = toolClass.getMetadata();
    this.tools.set(metadata.name, toolClass);
  }

  /**
   * Register multiple tool classes at once
   */
  registerAll(toolClasses: ToolClass[]): void {
    for (const toolClass of toolClasses) {
      this.register(toolClass);
    }
  }

  /**
   * Get tool instance (lazy initialization)
   */
  getInstance(name: string, server: any): any | null {
    const toolClass = this.tools.get(name);
    if (!toolClass) {
      return null;
    }

    // Check if instance already exists
    if (!this.instances.has(name)) {
      // Create new instance
      this.instances.set(name, new toolClass(server));
    }

    return this.instances.get(name);
  }

  /**
   * Execute a tool by name
   */
  async execute(name: string, args: any, context: any, server: any): Promise<any> {
    const instance = this.getInstance(name, server);
    if (!instance) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    return await instance.execute(args, context);
  }

  /**
   * Get all tool definitions for MCP
   */
  getToolDefinitions(sessionConfig?: SessionConfig): ToolMetadata[] {
    return Array.from(this.tools.values()).map(toolClass =>
      toolClass.getMetadata(sessionConfig)
    );
  }

  /**
   * Get list of tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Clear all instances (useful for testing)
   */
  clearInstances(): void {
    this.instances.clear();
  }
}

// Export a singleton instance
export const toolRegistry = new ToolRegistry();
