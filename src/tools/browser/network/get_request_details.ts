import fs from 'node:fs';
import * as path from 'node:path';
import type { ToolContext, ToolResponse, ToolMetadata, SessionConfig } from '../../common/types.js';
import { BrowserToolBase } from '../base.js';
import { makeConfirmPreview } from '../../common/confirm_output.js';

interface GetRequestDetailsArgs {
  index: number;
}

export class GetRequestDetailsTool extends BrowserToolBase {
  static getMetadata(sessionConfig?: SessionConfig): ToolMetadata {
    return {
      name: "get_request_details",
      description: "Get detailed information about a specific network request by index (from list_network_requests). Returns request/response headers, body (truncated at 500 chars), timing, and size. Request bodies with passwords are automatically masked. If a request or response body exceeds 500 chars, includes a preview and a one-time confirm_output token that, when called, saves the full body to disk under ./.mcp-web-inspector/network-bodies/ and returns the file path(s). Essential for debugging API responses and investigating failed requests.",
      inputSchema: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description: "Index of the request from list_network_requests output (e.g., [0], [1], etc.)"
          }
        },
        required: ["index"],
      },
    };
  }

  async execute(args: GetRequestDetailsArgs, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async () => {
      const { index } = args;

      const { getNetworkLog } = await import('../../../toolHandler.js');
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

      // If either request or response body was truncated, provide a confirm_output token
      const reqBody = req.requestData.postData || '';
      const respBody = req.responseData?.body || '';
      const reqTruncated = typeof reqBody === 'string' && reqBody.length > 500;
      const respTruncated = typeof respBody === 'string' && respBody.length > 500;

      if (reqTruncated || respTruncated) {
        // Helper to infer extension from content-type
        const getHeader = (headers: Record<string, string> | undefined, key: string): string | undefined => {
          if (!headers) return undefined;
          const found = Object.entries(headers).find(([k]) => k.toLowerCase() === key.toLowerCase());
          return found ? String(found[1]) : undefined;
        };

        const reqContentType = getHeader(req.requestData.headers, 'content-type') || '';
        const respContentType = getHeader(req.responseData?.headers || {}, 'content-type') || '';

        const inferExt = (ct: string): string => {
          const c = (ct || '').toLowerCase();
          if (c.includes('application/json')) return 'json';
          if (c.includes('text/html')) return 'html';
          if (c.startsWith('text/')) return 'txt';
          if (c.includes('xml')) return 'xml';
          return 'txt';
        };

        const { getScreenshotsDir } = await import('../../../toolHandler.js');
        const baseInspectorDir = path.dirname(getScreenshotsDir());
        const outDir = path.join(baseInspectorDir, 'network-bodies');

        const makeSafe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '-');
        const urlObj = (() => { try { return new URL(req.url); } catch { return null as any; } })();
        const host = urlObj?.hostname ? makeSafe(urlObj.hostname) : 'unknown-host';
        const ts = new Date().toISOString().replace(/[:.]/g, '-');

        const thunk = async (): Promise<string> => {
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
          }

          const messages: string[] = [];

          if (respTruncated) {
            const ext = inferExt(respContentType);
            const respFile = path.join(outDir, `${index}-${makeSafe(req.method)}-${host}-${ts}.response.${ext}`);
            fs.writeFileSync(respFile, respBody, 'utf8');
            messages.push(`✓ Saved response body to: ${path.relative(process.cwd(), respFile)} (${respBody.length} bytes${respContentType ? `, content-type: ${respContentType}` : ''})`);
          }

          if (reqTruncated) {
            const ext = inferExt(reqContentType);
            const reqFile = path.join(outDir, `${index}-${makeSafe(req.method)}-${host}-${ts}.request.${ext}`);
            fs.writeFileSync(reqFile, reqBody, 'utf8');
            messages.push(`✓ Saved request body to: ${path.relative(process.cwd(), reqFile)} (${reqBody.length} bytes${reqContentType ? `, content-type: ${reqContentType}` : ''})`);
          }

          if (messages.length === 0) {
            messages.push('Nothing to save (no truncated text bodies).');
          }

          messages.push('');
          messages.push('Note: .mcp-web-inspector/ is recommended in .gitignore to avoid committing sensitive data.');

          return messages.join('\n');
        };

        const totalLen = (respTruncated ? respBody.length : 0) + (reqTruncated ? reqBody.length : 0);
        const preview = makeConfirmPreview(thunk, {
          counts: { totalLength: totalLen, shownLength: 500, truncated: true },
          previewLines: [
            'Large network body detected — preview shown above.',
            'Confirm to save full body to disk (token-efficient).',
            `Output directory: ${path.relative(process.cwd(), outDir)}`,
          ],
        });

        lines.push('');
        lines.push(...preview.lines);
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
