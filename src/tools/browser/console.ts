import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse } from '../common/types.js';

interface ConsoleLogEntry {
  timestamp: number;
  message: string;
}

/**
 * Tool for retrieving and filtering console logs from the browser
 */
export class ConsoleLogsTool extends BrowserToolBase {
  private consoleLogs: ConsoleLogEntry[] = [];
  private lastCallTimestamp: number = 0;
  private lastNavigationTimestamp: number = 0;
  private lastInteractionTimestamp: number = 0;

  /**
   * Register a console message
   * @param type The type of console message
   * @param text The text content of the message
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

  /**
   * Execute the console logs tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    // No need to use safeExecute here as we don't need to interact with the page
    // We're just filtering and returning logs that are already stored

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