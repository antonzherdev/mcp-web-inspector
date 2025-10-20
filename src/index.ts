#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createToolDefinitions } from "./tools.js";
import { setupRequestHandlers } from "./requestHandler.js";
import { parseArgs } from "node:util";
import { setSessionConfig } from "./toolHandler.js";

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
  },
  strict: false,
});

// Configure session settings (session saving is enabled by default)
const sessionConfig = {
  saveSession: !Boolean(values['no-save-session']),
  userDataDir: String(values['user-data-dir'] || './.mcp-web-inspector'),
};
setSessionConfig(sessionConfig);

async function runServer() {
  const server = new Server(
    {
      name: "playwright-mcp",
      version: "1.0.6",
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