#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createToolDefinitions } from "./tools/common/registry.js";
import type { ToolMetadata } from "./tools/common/types.js";
import { setupRequestHandlers } from "./requestHandler.js";
import { parseArgs } from "node:util";
import { setSessionConfig, ensureBrowser, closeBrowser } from "./toolHandler.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "node:net";

// Get package.json version
const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");

// Expose package root for tools that need to spawn child processes (e.g., npx playwright)
// Tests and non-CLI environments can override or ignore this.
if (!process.env.MCP_WEB_INSPECTOR_PACKAGE_ROOT) {
  process.env.MCP_WEB_INSPECTOR_PACKAGE_ROOT = PACKAGE_ROOT;
}

const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
);
const VERSION = packageJson.version;

// Parse command line arguments
const { values } = parseArgs({
  options: {
    'no-save-session': {
      type: 'boolean',
      default: false,
    },
    'expose-sensitive-network-data': {
      type: 'boolean',
      default: false,
    },
    'user-data-dir': {
      type: 'string',
      default: './.mcp-web-inspector',
    },
    'headless': {
      type: 'boolean',
      default: false,
    },
    'cdp-port': {
      type: 'string',
    },
    'warmup-browser': {
      type: 'boolean',
      default: false,
    },
    'print-tools-json': {
      type: 'boolean',
      default: false,
    },
    'print-tools-md': {
      type: 'boolean',
      default: false,
    },
  },
  strict: false,
});

// Probe localhost:port; resolve true if free, false if in use.
function isPortFree(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

// First free port in [start, start+span). Throws if none.
async function findFreePort(start: number, span: number): Promise<number> {
  for (let p = start; p < start + span; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(`No free CDP port in ${start}..${start + span - 1}`);
}

// Resolve --cdp-port: 0 disables; explicit value used as-is; unset auto-picks from 9222 upward.
async function resolveCdpPort(raw: string | undefined): Promise<number> {
  if (raw === undefined) return findFreePort(9222, 100);
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n > 65535) {
    console.error(`Invalid --cdp-port value: ${raw}. Must be an integer in 0..65535 (0 disables).`);
    process.exit(1);
  }
  return n;
}

// Configure session settings (session saving is enabled by default)
const baseDir = String(values['user-data-dir'] || './.mcp-web-inspector');

async function runServer() {
  // Skip port resolution when only printing metadata — no browser will launch.
  const printOnly = Boolean(values['print-tools-json'] || values['print-tools-md']);
  const cdpPort = printOnly ? 0 : await resolveCdpPort(values['cdp-port'] as string | undefined);
  const sessionConfig = {
    saveSession: !Boolean(values['no-save-session']),
    userDataDir: `${baseDir}/user-data`,
    screenshotsDir: `${baseDir}/screenshots`,
    headlessDefault: Boolean(values['headless']) || (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY),
    exposeSensitiveNetworkData: Boolean(values['expose-sensitive-network-data']),
    cdpPort,
    warmupBrowser: Boolean(values['warmup-browser']),
  };
  setSessionConfig(sessionConfig);

  // Create tool definitions with session config
  const TOOLS = createToolDefinitions(sessionConfig);

  // CLI utilities: print tools metadata (JSON/Markdown) and exit
  if (values['print-tools-json']) {
    process.stdout.write(JSON.stringify(TOOLS, null, 2));
    return;
  }

  if (values['print-tools-md']) {
    const md = formatToolsMarkdown(TOOLS);
    process.stdout.write(md + "\n");
    return;
  }

  console.error(`Starting mcp-web-inspector v${VERSION}`);

  const cdpInstruction = sessionConfig.cdpPort > 0
    ? `External Playwright clients can attach to this browser via Chrome DevTools Protocol at http://localhost:${sessionConfig.cdpPort} — pass that URL to chromium.connectOverCDP() to share cookies, localStorage, and the open page set with this server.`
    : undefined;

  const server = new Server(
    {
      name: "mcp-web-inspector",
      version: VERSION,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
      ...(cdpInstruction ? { instructions: cdpInstruction } : {}),
    }
  );

  // Setup request handlers
  setupRequestHandlers(server, TOOLS);

  // Graceful shutdown logic. These handlers are registered before Playwright
  // installs its own (it does so on first browser launch), and Node runs exit
  // listeners in registration order — so exiting synchronously here would
  // pre-empt Playwright's cleanup and strand the Chromium process. Close the
  // browser ourselves, then exit.
  let shuttingDown = false;
  async function shutdown(reason: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`Shutdown: ${reason}`);

    // Bound the wait: a wedged browser must not keep this process alive.
    const timeout = new Promise<void>(resolve => setTimeout(resolve, 5000).unref());
    try {
      await Promise.race([closeBrowser(), timeout]);
    } catch (err) {
      console.error('Error closing browser during shutdown:', err);
    }
    process.exit(0);
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  // Create transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // A client that dies without signalling (crash, killed parent) just closes
  // the pipe. Without this the server would linger, holding a browser open.
  process.stdin.on('close', () => void shutdown('stdin closed'));
  transport.onclose = () => void shutdown('transport closed');

  // Optional eager browser launch. Off by default — sessions that never invoke
  // an MCP tool shouldn't pay for Chromium startup. Useful when external
  // clients (e.g. CDP seed/login scripts) need the browser up before any tool
  // call. Non-blocking — failures surface on the first tool call.
  if (sessionConfig.warmupBrowser) {
    ensureBrowser({ headless: sessionConfig.headlessDefault }).catch(err => {
      console.error("Eager browser warmup failed (will retry on first tool call):", err);
    });
  }
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

// Render a simple Markdown for tools (flat list)
function formatToolsMarkdown(tools: ToolMetadata[]): string {
  const lines: string[] = [];
  for (const t of tools) {
    lines.push(`#### \`${t.name}\``);
    if (t.description) lines.push(String(t.description));

    // Parameters
    const schema: any = (t as any).inputSchema;
    if (schema && schema.properties) {
      lines.push('');
      lines.push('- Parameters:');
      const req = new Set(Array.isArray(schema.required) ? schema.required : []);
      for (const key of Object.keys(schema.properties)) {
        const p = schema.properties[key] || {};
        const type = p.type || 'any';
        const desc = p.description || '';
        const required = req.has(key) ? 'required' : 'optional';
        lines.push(`  - ${key} (${type}, ${required}): ${desc}`);
      }
    }

    // Output bullets
    const outputs = (t as any).outputs as string | string[] | undefined;
    if (outputs) {
      const list = Array.isArray(outputs) ? outputs : [outputs];
      lines.push('');
      lines.push('- Output:');
      for (const item of list) {
        const s = String(item);
        lines.push(/^\s*[-*]/.test(s) ? `  ${s}` : `  - ${s}`);
      }
    }

    // Examples
    const examples = (t as any).examples as string[] | undefined;
    if (examples && examples.length) {
      lines.push('');
      lines.push('- Examples:');
      for (const ex of examples) lines.push(`- ${ex}`);
    }

    // Example outputs
    const exampleOutputs = (t as any).exampleOutputs as { call: string; output: string }[] | undefined;
    if (exampleOutputs && exampleOutputs.length) {
      for (const eo of exampleOutputs) {
        lines.push('');
        lines.push(`- Example Output (${eo.call}):`);
        lines.push('```');
        lines.push(eo.output);
        lines.push('```');
      }
    }

    lines.push('');
  }
  return lines.join('\n');
}
