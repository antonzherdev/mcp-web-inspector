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

      const { getNetworkLog, getSessionConfig } = await import('../../../toolHandler.js');
      const networkLog = getNetworkLog();
      const sessionConfig = getSessionConfig();
      const exposeSensitive = Boolean(sessionConfig?.exposeSensitiveNetworkData);

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

      // Helper to look up headers case-insensitively
      const getHeader = (headers: Record<string, string> | undefined, key: string): string | undefined => {
        if (!headers) return undefined;
        const found = Object.entries(headers).find(([k]) => k.toLowerCase() === key.toLowerCase());
        return found ? String(found[1]) : undefined;
      };

      const reqContentType = getHeader(req.requestData.headers, 'content-type') || '';
      const respContentType = getHeader(req.responseData?.headers || {}, 'content-type') || '';

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

      if (responseSize > 0 || requestSize > 0) {
        const reqPart = requestSize > 0 ? formatBytes(requestSize) : '0 bytes';
        const respPart = responseSize > 0 ? formatBytes(responseSize) : '0 bytes';
        lines.push(`Size: requestBody=${reqPart}, responseBody≈${respPart}`);
      }

      // Request headers (show important ones)
      const importantRequestHeaders = ['content-type', 'authorization', 'cookie', 'user-agent', 'accept'];
      const reqHeaders = Object.entries(req.requestData.headers)
        .filter(([key]) => importantRequestHeaders.includes(key.toLowerCase()));

      if (reqHeaders.length > 0) {
        lines.push('\nRequest Headers:');
        const order = (name: string) => {
          const idx = importantRequestHeaders.indexOf(name.toLowerCase());
          return idx === -1 ? importantRequestHeaders.length : idx;
        };
        reqHeaders
          .sort(([a], [b]) => {
            const oa = order(a);
            const ob = order(b);
            if (oa !== ob) return oa - ob;
            return a.localeCompare(b);
          })
          .forEach(([key, value]) => {
            const keyLower = key.toLowerCase();
            if (keyLower === 'authorization' || keyLower === 'cookie') {
              if (!exposeSensitive) {
                if (keyLower === 'authorization') {
                  const scheme = value.split(' ')[0] || '';
                  lines.push(`  ${key}: ${scheme ? `${scheme} <redacted>` : '<redacted>'}`);
                } else {
                  lines.push(`  ${key}: <redacted>`);
                }
              } else {
                const truncated = value.length > 60
                  ? value.substring(0, 57) + '...'
                  : value;
                lines.push(`  ${key}: ${truncated}`);
              }
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
          const compact = JSON.stringify(parsed);
          const pretty = JSON.stringify(parsed, null, 2);
          // Pretty-print small JSON bodies for readability; keep large ones compact
          displayData = pretty.length <= 500 ? pretty : compact;
        } catch (e) {
          // Not JSON, use as is
        }

        // Truncate at 500 chars
        if (displayData.length > 500) {
          const shown = 500;
          const remaining = displayData.length - shown;
          const coverage = Math.round((shown / displayData.length) * 1000) / 10;
          lines.push(`  ${displayData.substring(0, shown)}`);
          lines.push(`  ... [${remaining} more chars] (previewCoverage≈${coverage}%)`);
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
        const order = (name: string) => {
          const idx = importantResponseHeaders.indexOf(name.toLowerCase());
          return idx === -1 ? importantResponseHeaders.length : idx;
        };
        respHeaders
          .sort(([a], [b]) => {
            const oa = order(a);
            const ob = order(b);
            if (oa !== ob) return oa - ob;
            return a.localeCompare(b);
          })
          .forEach(([key, value]) => {
            const keyLower = key.toLowerCase();
            if (keyLower === 'set-cookie') {
              if (!exposeSensitive) {
                lines.push(`  ${key}: <redacted>`);
              } else {
                const truncated = value.length > 60
                  ? value.substring(0, 57) + '...'
                  : value;
                lines.push(`  ${key}: ${truncated}`);
              }
            } else {
              lines.push(`  ${key}: ${value}`);
            }
          });
      }

      // Response body
      if (req.responseData?.body) {
        lines.push('\nResponse Body (truncated at 500 chars):');

        const rawBody = req.responseData.body;
        let displayBody = rawBody;

        // Pretty-print small JSON responses for readability; keep large ones compact
        if (respContentType.toLowerCase().includes('application/json')) {
          try {
            const parsed = JSON.parse(rawBody);
            const compact = JSON.stringify(parsed);
            const pretty = JSON.stringify(parsed, null, 2);
            displayBody = pretty.length <= 500 ? pretty : compact;
          } catch {
            // Not valid JSON, fall back to raw body
          }
        }

        if (displayBody.length > 500) {
          const shown = 500;
          const remaining = displayBody.length - shown;
          const coverage = Math.round((shown / displayBody.length) * 1000) / 10;
          lines.push(`  ${displayBody.substring(0, shown)}`);
          lines.push(`  ... [${remaining} more chars] (previewCoverage≈${coverage}%)`);
        } else {
          lines.push(`  ${displayBody}`);
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
            const respFile = path.join(outDir, `${ts}-${index}-${makeSafe(req.method)}-${host}.response.${ext}`);
            fs.writeFileSync(respFile, respBody, 'utf8');
            messages.push(`✓ Saved full response body to: ${path.relative(process.cwd(), respFile)} (${respBody.length} bytes${respContentType ? `, content-type: ${respContentType}` : ''})`);
          }

          if (reqTruncated) {
            const ext = inferExt(reqContentType);
            const reqFile = path.join(outDir, `${ts}-${index}-${makeSafe(req.method)}-${host}.request.${ext}`);
            fs.writeFileSync(reqFile, reqBody, 'utf8');
            messages.push(`✓ Saved full request body to: ${path.relative(process.cwd(), reqFile)} (${reqBody.length} bytes${reqContentType ? `, content-type: ${reqContentType}` : ''})`);
          }

          if (messages.length === 0) {
            messages.push('Nothing to save (no truncated text bodies).');
          } else {
            messages.push('');
            messages.push(`Paths above are relative to the current working directory: ${process.cwd()}`);
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
