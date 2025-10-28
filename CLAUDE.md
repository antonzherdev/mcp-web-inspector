# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Model Context Protocol (MCP) server that provides browser automation capabilities using Playwright. It enables LLMs to interact with web pages, take screenshots, execute JavaScript, and perform HTTP requests through a set of MCP tools.

Server name: `playwright-mcp` (important for tool name length constraints - some clients like Cursor have a 60-character limit for `server_name:tool_name`)

## Command Line Options

### Session Persistence

**By default**, browser session data (cookies, localStorage, sessionStorage) is automatically saved and persists across browser restarts.

**Available flags:**

- `--no-save-session` - Disable session persistence (start fresh each time)
- `--user-data-dir <path>` - Customize where session data is stored (default: `./.mcp-web-inspector`)

**Examples:**

```bash
# Default behavior - sessions saved in ./.mcp-web-inspector
mcp-web-inspector

# Disable session persistence
mcp-web-inspector --no-save-session

# Custom session directory
mcp-web-inspector --user-data-dir ./my-custom-sessions

# Both flags together
mcp-web-inspector --user-data-dir /tmp/browser-sessions
```

### Default Behavior

Data is organized in `./.mcp-web-inspector/`:
```
.mcp-web-inspector/
  ├── user-data/       # Browser sessions (cookies, localStorage, sessionStorage)
  └── screenshots/     # Screenshot files
```

- Browser sessions persist across restarts
- Screenshots saved to dedicated directory
- No configuration needed - just works out of the box

### Clearing Saved Data

```bash
# Clear all data (default directory)
rm -rf ./.mcp-web-inspector

# Clear only sessions
rm -rf ./.mcp-web-inspector/user-data

# Clear only screenshots
rm -rf ./.mcp-web-inspector/screenshots

# Custom directory
rm -rf ./my-custom-sessions
```

### Security Best Practices

**⚠️ IMPORTANT**: Always add `.mcp-web-inspector/` to `.gitignore` to prevent committing:
- Browser session data (cookies, localStorage, sessionStorage)
- Saved screenshots (may contain sensitive information)
- Authentication tokens and credentials

**Why this matters:**
- Session data contains cookies and authentication tokens
- Screenshots may capture sensitive user data
- Committing this data could leak credentials to the repository
- Session files can bloat git history

**Recommended `.gitignore` entry:**
```gitignore
# MCP Web Inspector data
.mcp-web-inspector/
```

## Development Commands

### Building
```bash
npm run build          # Compile TypeScript to dist/
npm run watch          # Watch mode for development
npm run prepare        # Build and make dist files executable (runs on npm install)
```

### Testing
```bash
npm test               # Run tests without coverage
npm run test:coverage  # Run tests with coverage report (outputs to coverage/)
npm run test:custom    # Run tests using custom script (node run-tests.cjs)
node run-tests.cjs     # Alternative way to run tests with coverage
```

## Available Tools

**See `src/tools/common/registry.ts` for complete tool definitions and up-to-date descriptions.**

### Tool Categories

**Navigation & Interaction** (13 tools):
- `navigate`, `click`, `iframe_click`, `fill`, `iframe_fill`, `select`, `hover`, `upload_file`, `go_back`, `go_forward`, `drag`, `press_key`, `click_and_switch_tab`

**Element Inspection & Debugging** (10 tools):
- `inspect_dom` - **PRIMARY** - Progressive DOM inspection with semantic filtering
- `inspect_ancestors` - **DEBUG** - Find layout constraints (margins, width, overflow, flexbox/grid)
- `get_test_ids`, `query_selector_all`, `element_visibility`, `find_by_text`, `get_computed_styles`, `measure_element`, `element_exists`, `compare_positions`

**Content Extraction** (4 tools):
- `screenshot`, `get_visible_text`, `get_visible_html`, `save_as_pdf`

**JavaScript & Console** (2 tools):
- `evaluate`, `console_logs`

**Network & Responses** (2 tools):
- `expect_response`, `assert_response`

**Configuration** (3 tools):
- `custom_user_agent`, `set_color_scheme`, `close`

**HTTP Requests** (5 tools):
- `get`, `post`, `put`, `patch`, `delete`

### Selector Shortcuts

All browser tools support test ID shortcuts via `normalizeSelector()`:
- `testid:submit-button` → `[data-testid="submit-button"]`
- `data-test:login-form` → `[data-test="login-form"]`
- `data-cy:username` → `[data-cy="username"]`
- Regular CSS selectors pass through unchanged

## Architecture

### Server Structure (MCP Protocol)

The server follows the Model Context Protocol specification:

1. **Entry Point** (`src/index.ts`): Sets up MCP server with stdio transport, creates tool definitions, and configures request handlers with graceful shutdown logic.

2. **Request Handler** (`src/requestHandler.ts`): Implements MCP protocol handlers:
   - `ListResourcesRequestSchema`: Exposes console logs and screenshots as resources
   - `ReadResourceRequestSchema`: Retrieves resource contents
   - `ListToolsRequestSchema`: Returns available tools
   - `CallToolRequestSchema`: Delegates to `handleToolCall` for execution

3. **Tool Handler** (`src/toolHandler.ts`): Central dispatcher for tool execution
   - Manages global browser state (browser, page, currentBrowserType)
   - Implements `ensureBrowser()` to lazily launch browsers with reconnection handling
   - Routes tool calls to appropriate tool instances
   - Contains browser cleanup and error recovery logic

### Tool Organization

All tools are registered through `src/tools/common/registry.ts` with implementations in `src/tools/browser/`:

- **Browser tool registry**: Use `getBrowserToolNames()` to list all tools requiring a Playwright browser instance (navigate, click, screenshot, inspect_dom, etc.)

All browser tools extend `BrowserToolBase` (`src/tools/browser/base.ts`) which provides:
- `safeExecute()`: Wrapper with browser connection validation and error handling
- `ensurePage()` and `validatePageAvailable()`: Page availability checks
- `normalizeSelector()`: Converts test ID shortcuts to full selectors (e.g., `testid:foo` → `[data-testid="foo"]`)
- `selectPreferredLocator()`: **STANDARD** - Selects elements with visibility preference (see Element Selection below)
- `formatElementSelectionInfo()`: Formats warnings for duplicate selectors with testid tip
- Automatic browser state reset on disconnection errors

**Tool parameters documented in `src/tools/common/registry.ts`**

### Tool Implementation Pattern

Tools follow a consistent pattern implementing the `ToolHandler` interface (`src/tools/common/types.ts`):

```typescript
export interface ToolHandler {
  execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
```

The `ToolContext` provides browser, page, apiContext, and server references. Tools return standardized `ToolResponse` objects with content arrays and error flags.

### Browser Lifecycle

Browser instances are managed globally in `toolHandler.ts`:
- Browsers launch on first tool use (lazy initialization)
- Support for chromium, firefox, and webkit engines
- Automatic reconnection handling for disconnected browsers
- Console message registration via `registerConsoleMessage()` for all page events
- Clean shutdown on SIGINT/SIGTERM signals

The `ensureBrowser()` function handles:
- Browser disconnection detection and cleanup
- Closed page recovery (creates new page)
- Browser type switching (e.g., chromium → firefox)
- Viewport, user agent, and headless mode configuration
- Retry logic for initialization failures

### File Structure

```
src/
├── index.ts                 # MCP server entry point
├── requestHandler.ts        # MCP protocol handlers
├── toolHandler.ts          # Tool execution dispatcher, browser state
├── tools/
│   ├── common/registry.ts  # Tool registry, definitions, and helpers
├── tools/
│   ├── common/types.ts     # Shared interfaces (ToolContext, ToolResponse)
│   └── browser/            # Browser automation tools
│       ├── base.ts         # BrowserToolBase class with normalizeSelector()
│       ├── interaction.ts  # Click, fill, select, hover, etc.
│       ├── navigation.ts   # Navigate, go back/forward
│       ├── screenshot.ts   # Screenshot tool
│       ├── console.ts      # Console logs retrieval
│       ├── visiblePage.ts  # Get visible text/HTML
│       ├── output.ts       # PDF generation
│       ├── elementInspection.ts  # Element visibility and position tools
│       └── ...
└── __tests__/              # Jest test suites
    └── tools/
        └── browser/
            ├── elementInspection.test.ts  # Tests for visibility & position tools
            └── ...
```

## Testing Notes

- Tests use Jest with ts-jest preset
- Test environment: Node.js
- Coverage excludes `src/index.ts`
- Tests are in `src/__tests__/**/*.test.ts`
- Module name mapper handles `.js` imports in ESM context
- Uses `tsconfig.test.json` for test-specific TypeScript config

## Important Constraints

1. **Tool Naming**: Keep tool names short - some clients (Cursor) limit `server_name:tool_name` to 60 characters. Server name is `playwright-mcp`.

2. **Browser State**: Browser and page instances are global singletons. Browser type changes (chromium/firefox/webkit) force browser restart.

3. **Error Handling**: Tools must handle browser disconnection gracefully. The `BrowserToolBase.safeExecute()` method automatically resets state on connection errors.

4. **ESM Modules**: This project uses ES modules (type: "module" in package.json). Import statements must include `.js` extensions even for `.ts` files.

5. **Console Logging**: Page console messages, exceptions, and unhandled promise rejections are captured via `registerConsoleMessage()` and stored in `ConsoleLogsTool`.

## Environment Variables

- `CHROME_EXECUTABLE_PATH`: Custom path to Chrome/Chromium executable (optional)

## Contributing Notes

When adding new tools:
1. Create a tool class in `src/tools/browser/` extending `BrowserToolBase`
2. Append the class to the `BROWSER_TOOL_CLASSES` array in `src/tools/browser/register.ts`
3. Update `handleToolCall()` in `src/toolHandler.ts` if the tool requires new context handling
4. Add tests in `src/__tests__/tools/browser/`
5. **Follow principles in `TOOL_DESIGN_PRINCIPLES.md`**

### Tool Design Principles (Summary)

**See `TOOL_DESIGN_PRINCIPLES.md` for comprehensive guidelines.**

Key principles:
- **Atomic operations** - One tool does ONE thing
- **Minimal parameters** - Aim for 1-3, max 5
- **Primitive types** - Use string/number/boolean over nested objects
- **Token-efficient output** - Use compact text format, not verbose JSON
- **Explicit documentation** - List ALL outputs in description, even conditional ones

**Critical Rule:** Tool descriptions MUST explicitly list all possible outputs. Don't use vague terms like "layout properties" - instead specify exactly what fields are returned (e.g., "width constraints (w, max-w, min-w), margins (↑↓←→), flexbox context when set"). See TOOL_DESIGN_PRINCIPLES.md §13 for examples.
