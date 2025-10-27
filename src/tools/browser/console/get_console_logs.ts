import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse } from '../../common/types.js';

interface ConsoleLogEntry {
  timestamp: number;
  message: string;
}

/**
 * Tool for retrieving and filtering console logs from the browser
 */
export class GetConsoleLogsTool extends BrowserToolBase {
  private consoleLogs: ConsoleLogEntry[] = [];
  private lastCallTimestamp: number = 0;
  private lastNavigationTimestamp: number = 0;
  private lastInteractionTimestamp: number = 0;

  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "get_console_logs",
      description: "Retrieve console logs from the browser with filtering options",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Type of logs to retrieve (all, error, warning, log, info, debug, exception)",
            enum: ["all", "error", "warning", "log", "info", "debug", "exception"]
          },
          search: {
            type: "string",
            description: "Text to search for in logs (handles text with square brackets)"
          },
          limit: {
            type: "number",
            description: "Maximum number of logs to return"
          },
          since: {
            type: "string",
            description: "Filter logs since a specific event: 'last-call' (since last get_console_logs call), 'last-navigation' (since last page navigation), or 'last-interaction' (since last user interaction like click, fill, etc.)",
            enum: ["last-call", "last-navigation", "last-interaction"]
          },
          clear: {
            type: "boolean",
            description: "Whether to clear logs after retrieval (default: false)"
          }
        },
        required: [],
      },
    };
  }

  /**
   * Register a console message
   */
  registerConsoleMessage(type: string, text: string): void {
    const logEntry: ConsoleLogEntry = {
      timestamp: Date.now(),
      message: `[${type}] ${text}`
    };
    this.consoleLogs.push(logEntry);
  }

  /**
   * Update the last navigation timestamp
   */
  updateLastNavigationTimestamp(): void {
    this.lastNavigationTimestamp = Date.now();
  }

  /**
   * Update the last interaction timestamp
   */
  updateLastInteractionTimestamp(): void {
    this.lastInteractionTimestamp = Date.now();
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    let logs = [...this.consoleLogs];

    // Filter by timestamp if 'since' parameter is specified
    if (args.since) {
      let sinceTimestamp: number;

      switch (args.since) {
        case 'last-call':
          sinceTimestamp = this.lastCallTimestamp;
          break;
        case 'last-navigation':
          sinceTimestamp = this.lastNavigationTimestamp;
          break;
        case 'last-interaction':
          sinceTimestamp = this.lastInteractionTimestamp;
          break;
        default:
          return createSuccessResponse(`Invalid 'since' value: ${args.since}. Must be one of: last-call, last-navigation, last-interaction`);
      }

      logs = logs.filter(log => log.timestamp > sinceTimestamp);
    }

    // Update last call timestamp
    this.lastCallTimestamp = Date.now();

    // Filter by type if specified
    if (args.type && args.type !== 'all') {
      logs = logs.filter(log => log.message.startsWith(`[${args.type}]`));
    }

    // Filter by search text if specified
    if (args.search) {
      logs = logs.filter(log => log.message.includes(args.search));
    }

    // Limit the number of logs if specified
    if (args.limit && args.limit > 0) {
      logs = logs.slice(-args.limit);
    }

    // Extract messages from log entries
    const messages = logs.map(log => log.message);

    // Clear logs if requested
    if (args.clear) {
      this.consoleLogs = [];
    }

    // Format the response
    if (messages.length === 0) {
      return createSuccessResponse("No console logs matching the criteria");
    } else {
      return createSuccessResponse([
        `Retrieved ${messages.length} console log(s):`,
        ...messages
      ]);
    }
  }

  /**
   * Get all console logs
   */
  getConsoleLogs(): string[] {
    return this.consoleLogs.map(log => log.message);
  }

  /**
   * Clear all console logs
   */
  clearConsoleLogs(): void {
    this.consoleLogs = [];
  }
}
