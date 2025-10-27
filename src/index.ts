#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createToolDefinitions } from "./tools/common/registry.js";
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

  // Create tool definitions with session config
  const TOOLS = createToolDefinitions(sessionConfig);

  // Setup request handlers
  setupRequestHandlers(server, TOOLS);

  // Graceful shutdown logic
  function shutdown() {
    console.log('Shutdown signal received');
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
