#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createToolDefinitions } from "./tools/common/registry.js";
import type { ToolMetadata } from "./tools/common/types.js";
import { setupRequestHandlers } from "./requestHandler.js";
import { parseArgs } from "node:util";
import { setSessionConfig } from "./toolHandler.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Get package.json version
const __dirname = dirname(fileURLToPath(import.meta.url));
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
    'user-data-dir': {
      type: 'string',
      default: './.mcp-web-inspector',
    },
    'headless': {
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

// Configure session settings (session saving is enabled by default)
const baseDir = String(values['user-data-dir'] || './.mcp-web-inspector');
const sessionConfig = {
  saveSession: !Boolean(values['no-save-session']),
  userDataDir: `${baseDir}/user-data`,
  screenshotsDir: `${baseDir}/screenshots`,
  headlessDefault: Boolean(values['headless']),
};
setSessionConfig(sessionConfig);

async function runServer() {
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
    }
  );

  // Setup request handlers
  setupRequestHandlers(server, TOOLS);

  // Graceful shutdown logic
  function shutdown() {
    console.error('Shutdown signal received');
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', shutdown);
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  // Create transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);
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
