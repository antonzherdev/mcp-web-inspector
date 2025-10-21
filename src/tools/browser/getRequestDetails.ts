import type { ToolContext, ToolResponse } from '../common/types.js';
import { BrowserToolBase } from './base.js';
import { getNetworkLog } from '../../toolHandler.js';

interface GetRequestDetailsArgs {
  index: number;
}

export class GetRequestDetailsTool extends BrowserToolBase {
  async execute(args: GetRequestDetailsArgs, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async () => {
      const { index } = args;

      const networkLog = getNetworkLog();

      if (index < 0 || index >= networkLog.length) {
        return {
          content: [{
            type: "text",
            text: `Error: Invalid index ${index}. Valid range: 0-${networkLog.length - 1}`
          }],
          isError: true
        };
      }

      const req = networkLog[index];

      // Build compact text response
      const lines: string[] = [];

      lines.push(`Request Details [${index}]:\n`);
      lines.push(`${req.method} ${req.url}`);

      if (req.status) {
        lines.push(`Status: ${req.status} ${req.statusText || 'OK'} (took ${req.timing}ms)`);
      } else {
        lines.push(`Status: Pending (no response yet)`);
      }

      // Calculate sizes
      const requestSize = req.requestData.postData
        ? req.requestData.postData.length
        : 0;
      const responseSize = req.responseData?.body
        ? req.responseData.body.length
        : 0;

      const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 bytes';
        if (bytes < 1024) return `${bytes} bytes`;
        return `${(bytes / 1024).toFixed(1)}KB`;
      };

      if (responseSize > 0) {
        lines.push(`Size: ${formatBytes(requestSize)} → ${formatBytes(responseSize)}`);
      } else if (requestSize > 0) {
        lines.push(`Size: ${formatBytes(requestSize)} →`);
      }

      // Request headers (show important ones)
      const importantRequestHeaders = ['content-type', 'authorization', 'cookie', 'user-agent', 'accept'];
      const reqHeaders = Object.entries(req.requestData.headers)
        .filter(([key]) => importantRequestHeaders.includes(key.toLowerCase()));

      if (reqHeaders.length > 0) {
        lines.push('\nRequest Headers:');
        reqHeaders.forEach(([key, value]) => {
          // Truncate sensitive values
          if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'cookie') {
            const truncated = value.length > 20
              ? value.substring(0, 17) + '...'
              : value;
            lines.push(`  ${key}: ${truncated}`);
          } else {
            lines.push(`  ${key}: ${value}`);
          }
        });
      }

      // Request body
      if (req.requestData.postData) {
        lines.push('\nRequest Body:');

        // Mask passwords in JSON
        let displayData = req.requestData.postData;
        try {
          const parsed = JSON.parse(displayData);
          if (parsed.password) parsed.password = '***';
          if (parsed.pass) parsed.pass = '***';
          displayData = JSON.stringify(parsed);
        } catch (e) {
          // Not JSON, use as is
        }

        // Truncate at 500 chars
        if (displayData.length > 500) {
          lines.push(`  ${displayData.substring(0, 500)}`);
          lines.push(`  ... [${displayData.length - 500} more chars]`);
        } else {
          lines.push(`  ${displayData}`);
        }
      }

      // Response headers (show important ones)
      const importantResponseHeaders = ['content-type', 'set-cookie', 'cache-control', 'location', 'x-cache'];
      const respHeaders = req.responseData?.headers
        ? Object.entries(req.responseData.headers)
            .filter(([key]) => importantResponseHeaders.includes(key.toLowerCase()))
        : [];

      if (respHeaders.length > 0) {
        lines.push('\nResponse Headers:');
        respHeaders.forEach(([key, value]) => {
          // Truncate cookies
          if (key.toLowerCase() === 'set-cookie') {
            const truncated = value.length > 60
              ? value.substring(0, 57) + '...'
              : value;
            lines.push(`  ${key}: ${truncated}`);
          } else {
            lines.push(`  ${key}: ${value}`);
          }
        });
      }

      // Response body
      if (req.responseData?.body) {
        lines.push('\nResponse Body (truncated at 500 chars):');

        const body = req.responseData.body;

        if (body.length > 500) {
          lines.push(`  ${body.substring(0, 500)}`);
          lines.push(`  ... [${body.length - 500} more chars]`);
        } else {
          lines.push(`  ${body}`);
        }
      } else if (req.status) {
        lines.push('\nResponse Body: (none or binary data)');
      }

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
