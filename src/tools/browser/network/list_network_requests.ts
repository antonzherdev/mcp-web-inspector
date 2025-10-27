import type { ToolContext, ToolResponse, ToolMetadata, SessionConfig } from '../../common/types.js';
import { BrowserToolBase } from '../base.js';

interface ListNetworkRequestsArgs {
  type?: string;
  limit?: number;
}

export class ListNetworkRequestsTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "list_network_requests",
      description: "List recent network requests captured by the browser. Returns compact text format with method, URL, status, resource type, timing, and size. Essential for debugging API calls and performance issues. Use get_request_details() to inspect full headers and body for specific requests.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Filter by resource type: 'xhr', 'fetch', 'script', 'stylesheet', 'image', 'font', 'document', etc. Omit to show all types."
          },
          limit: {
            type: "number",
            description: "Maximum number of requests to return, most recent first (default: 50)"
          }
        },
        required: [],
      },
    };
  }

  async execute(args: ListNetworkRequestsArgs, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async () => {
      const { type, limit = 50 } = args;

      const { getNetworkLog } = await import('../../../toolHandler.js');
      const networkLog = getNetworkLog();

      // Filter by resource type if specified
      let filtered = type
        ? networkLog.filter(req => req.resourceType === type)
        : networkLog;

      // Get most recent requests (reverse chronological)
      filtered = filtered.slice(-limit).reverse();

      if (filtered.length === 0) {
        return {
          content: [{
            type: "text",
            text: type
              ? `No network requests found for type: ${type}`
              : "No network requests captured yet"
          }],
          isError: false
        };
      }

      // Format output in compact text format
      const lines = [`Network Requests (${filtered.length} of ${networkLog.length}, recent first):\n`];

      filtered.forEach(req => {
        const statusInfo = req.status
          ? `${req.status} ${req.statusText || 'OK'}`
          : 'pending';

        const timing = req.timing ? `${req.timing}ms` : '...';

        // Check if cached
        const cached = req.responseData?.headers['cache-control']?.includes('max-age') ||
                      req.responseData?.headers['x-cache'] === 'HIT'
                      ? 'cached'
                      : '';

        // Get response size
        let sizeInfo = '';
        if (req.responseData?.body) {
          const bytes = req.responseData.body.length;
          if (bytes < 1024) {
            sizeInfo = `${bytes}B`;
          } else {
            sizeInfo = `${(bytes / 1024).toFixed(1)}KB`;
          }
        }

        const parts = [
          `[${req.index}]`,
          req.method,
          req.url.length > 80 ? req.url.substring(0, 77) + '...' : req.url,
          statusInfo,
          '|',
          req.resourceType,
          '|',
          timing
        ];

        if (sizeInfo) parts.push('|', sizeInfo);
        if (cached) parts.push('|', cached);

        lines.push(parts.join(' '));
      });

      lines.push('\nUse get_request_details(index) for full info');

      return {
        content: [{
          type: "text",
          text: lines.join('\n')
        }],
        isError: false
      };
    });
  }
}
