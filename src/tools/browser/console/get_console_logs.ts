import { BrowserToolBase } from '../base.js';
import { ToolContext, ToolResponse, ToolMetadata, SessionConfig, createSuccessResponse, createErrorResponse } from '../../common/types.js';
import { makeConfirmPreview } from '../../common/confirmHelpers.js';

interface ConsoleLogEntry {
  timestamp: number;
  message: string;
}

/**
 * Tool for retrieving and filtering console logs from the browser
 */
export class GetConsoleLogsTool extends BrowserToolBase {
  // Stored logs and timestamps
  private consoleLogs: ConsoleLogEntry[] = [];
  private lastCallTimestamp: number = 0;
  private lastNavigationTimestamp: number = 0;
  private lastInteractionTimestamp: number = 0;

  // Track latest instance for sibling tool access (module-level singleton pattern)
  static latestInstance: GetConsoleLogsTool | null = null;

  constructor(server: any) {
    super(server);
    GetConsoleLogsTool.latestInstance = this;
  }

  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "get_console_logs",
      description: "Retrieve console logs with filtering and token‑efficient output. Defaults: since='last-interaction', limit=20, format='grouped'. Grouped output deduplicates identical lines and shows counts. Use format='raw' for chronological, ungrouped lines. Large outputs return a preview and a one-time token to fetch the full payload.",
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
            description: "Maximum entries to return (groups when grouped, lines when raw). Default: 20"
          },
          since: {
            type: "string",
            description: "Filter logs since a specific event: 'last-call' (since last get_console_logs call), 'last-navigation' (since last page navigation), or 'last-interaction' (since last user interaction like click, fill, etc.). Default: 'last-interaction'",
            enum: ["last-call", "last-navigation", "last-interaction"]
          },
          format: {
            type: "string",
            description: "Output format: 'grouped' (default, deduped with counts) or 'raw' (chronological, ungrouped)",
            enum: ["grouped", "raw"]
          },
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
    // Defaults
    const format: 'grouped' | 'raw' = args.format === 'raw' ? 'raw' : 'grouped';
    const limit: number = typeof args.limit === 'number' && args.limit > 0 ? Math.floor(args.limit) : 20;
    const sinceArg: string | undefined = args.since || 'last-interaction';
    const PREVIEW_THRESHOLD = 2000; // chars

    let logs = [...this.consoleLogs];

    // Filter by timestamp if 'since' parameter is specified
    if (sinceArg) {
      let sinceTimestamp: number;
      switch (sinceArg) {
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
          return createSuccessResponse(`Invalid 'since' value: ${sinceArg}. Must be one of: last-call, last-navigation, last-interaction`);
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

    // Build output according to format
    if (format === 'raw') {
      // Chronological lines, limit applied to last N entries
      const limited = limit > 0 ? logs.slice(-limit) : logs;
      const messages = limited.map(l => l.message);

      if (messages.length === 0) {
        return createSuccessResponse("No console logs matching the criteria");
      }

      // Guard large outputs by character size
      const header = `Retrieved ${messages.length} console log(s):`;
      const textPayload = [header, ...messages].join('\n');
      if (textPayload.length >= PREVIEW_THRESHOLD) {
        const previewLines = [
          `Matched ${logs.length} log(s). Showing ${Math.min(messages.length, 10)} line(s) preview.`,
          ...messages.slice(0, Math.min(messages.length, 10)),
        ];
        const preview = makeConfirmPreview(textPayload, {
          counts: { totalLength: textPayload.length, shownLength: previewLines.join('\n').length, totalMatched: logs.length, shownCount: Math.min(messages.length, 10), truncated: true },
          previewLines,
          extraTips: ['Tip: refine with search/type/since/limit or prefer grouped format.'],
        });
        return createSuccessResponse(preview.lines.join('\n'));
      }

      return createSuccessResponse([header, ...messages]);
    }

    // Grouped format (default)
    const groups = new Map<string, { count: number; firstTs: number; lastTs: number; example: string }>();
    for (const l of logs) {
      const key = l.message; // includes [type] prefix per registerConsoleMessage
      const g = groups.get(key);
      if (g) {
        g.count += 1;
        g.lastTs = l.timestamp;
      } else {
        groups.set(key, { count: 1, firstTs: l.timestamp, lastTs: l.timestamp, example: l.message });
      }
    }

    if (groups.size === 0) {
      return createSuccessResponse("No console logs matching the criteria");
    }

    // Order groups by first occurrence time
    const ordered = Array.from(groups.entries()).sort((a, b) => a[1].firstTs - b[1].firstTs);
    const limitedGroups = limit > 0 ? ordered.slice(0, limit) : ordered;
    const lines: string[] = [];
    lines.push(`Retrieved ${limitedGroups.length} console log(s):`);
    for (const [msg, info] of limitedGroups) {
      const line = `${msg} (× ${info.count})`;
      lines.push(line);
    }

    // Guard large grouped outputs
    const textPayload = lines.join('\n');
    if (textPayload.length >= PREVIEW_THRESHOLD) {
      const previewLines = [
        `Matched ${groups.size} group(s). Showing ${limitedGroups.length}.`,
        ...lines.slice(0, Math.min(lines.length, 12)),
      ];
      const preview = makeConfirmPreview(textPayload, {
        counts: { totalLength: textPayload.length, shownLength: previewLines.join('\n').length, totalMatched: groups.size, shownCount: limitedGroups.length, truncated: true },
        previewLines,
        extraTips: ['Tip: refine with search/type/since/limit.'],
      });
      return createSuccessResponse(preview.lines.join('\n'));
    }

    return createSuccessResponse(lines);
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

  /**
   * Return messages for logs captured after the last recorded navigation
   */
  getLogsSinceLastNavigation(): string[] {
    const since = this.lastNavigationTimestamp;
    return this.consoleLogs
      .filter(log => log.timestamp > since)
      .map(log => log.message);
  }
}

/**
 * Tool for clearing console logs (atomic operation)
 */
export class ClearConsoleLogsTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "clear_console_logs",
      description: "Clears captured console logs and returns the number of entries cleared.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    };
  }

  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    const inst = GetConsoleLogsTool.latestInstance;
    if (!inst) {
      return createSuccessResponse('Cleared 0 console log(s)');
    }
    const count = inst.getConsoleLogs().length;
    inst.clearConsoleLogs();
    return createSuccessResponse(`Cleared ${count} console log(s)`);
  }
}
