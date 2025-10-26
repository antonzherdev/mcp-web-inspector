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

### Browser Tools

#### Navigation & Interaction
- `navigate` - Navigate to a URL (supports chromium/firefox/webkit, viewport config, headless mode). When no viewport dimensions are specified, automatically matches the screen size for a full-screen experience.
- `click` - Click an element
- `iframe_click` - Click an element inside an iframe
- `fill` - Fill an input field
- `iframe_fill` - Fill an input field inside an iframe
- `select` - Select from dropdown
- `hover` - Hover over an element
- `upload_file` - Upload file to input[type='file']
- `go_back` - Navigate back in history
- `go_forward` - Navigate forward in history
- `drag` - Drag element to target location
- `press_key` - Press keyboard key
- `click_and_switch_tab` - Click link and switch to new tab

#### Element Inspection & Debugging
- `inspect_dom` - **PRIMARY TOOL** - Progressive DOM inspection with semantic filtering, automatic wrapper drilling (maxDepth: 5 default), and spatial layout detection. Returns only meaningful elements (semantic HTML, test IDs, ARIA roles, interactive elements) while skipping non-semantic wrappers. Supports visual content (svg, canvas, audio, iframe). Use for understanding page structure.
- `inspect_ancestors` - **DEBUG LAYOUT CONSTRAINTS** - Walk up the DOM tree to find where width constraints, margins, borders, and overflow clipping come from. Shows for each ancestor: position/size, width constraints (w, max-w, min-w), margins with directional arrows (↑↓←→), padding, display type, borders, overflow (🔒=hidden, ↕️=scroll), flexbox context (flex direction justify items gap), grid context (cols rows gap), position/z-index/transform when set. Automatically detects horizontal centering via auto margins and flags clipping points (🎯). Essential for debugging unexpected centering, constrained width, or clipped content. Default depth: 10 levels (reaches `<body>` in most React apps), max: 15. Use after `inspect_dom` when you need to understand parent layout flow.
- `get_test_ids` - Discover all test identifiers on the page (data-testid, data-test, data-cy, etc.). Returns compact text list grouped by attribute type. Essential for test-driven workflows.
- `query_selector_all` - Test a selector and return detailed information about all matched elements. Essential for selector debugging and finding the right element to interact with. Returns compact text format with element tag, position, text content, visibility status, and diagnostic info (display:none, opacity:0, zero size). Supports testid shortcuts and limit parameter (default: 10).
- `element_visibility` - Check if element is visible with detailed diagnostics (viewport, clipping, coverage, scroll needed)
- `find_by_text` - Find elements by text content (partial or exact match, case-sensitive/insensitive). Essential for pages without test IDs. Returns elements with position, visibility, and interaction state.
- `get_computed_styles` - Get computed CSS styles for an element. Returns styles grouped by category (Layout, Visibility, Spacing, Typography). Useful for debugging CSS properties and understanding why elements behave unexpectedly.
- `measure_element` - Get box model measurements (position, size, margin, padding, border). Returns compact visual representation with directional arrows (↑↓←→). Essential for layout debugging, spacing validation, and understanding CSS box model issues.
- `element_exists` - Ultra-lightweight existence check (< 50 chars response). Returns ✓ exists or ✗ not found. Most common check before interaction.
- `compare_positions` - Compare positions and alignment of two elements. Validates layout consistency by checking if elements are aligned (top, left, right, bottom) or have the same dimensions (width, height). Returns compact text format with alignment status and difference in pixels. Essential for visual regression testing.

#### Content Extraction
- `screenshot` - Take screenshots (full page or element, base64 or PNG file)
- `get_visible_text` - Get visible text content of page
- `get_visible_html` - Get HTML content (with script/comment/style removal options)
- `save_as_pdf` - Save page as PDF

#### JavaScript & Console
- `evaluate` - Execute JavaScript in browser console
- `console_logs` - Retrieve browser console logs (with filtering by type/search/limit)

#### Network & Responses
- `expect_response` - Start waiting for HTTP response
- `assert_response` - Validate previously initiated HTTP response wait

#### Configuration
- `custom_user_agent` - Set custom User Agent
- `close` - Close browser and release resources

### API Tools (HTTP Requests)
- `get` - HTTP GET request
- `post` - HTTP POST request (with body, token, custom headers)
- `put` - HTTP PUT request
- `patch` - HTTP PATCH request
- `delete` - HTTP DELETE request

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

All tools are browser automation tools defined in `src/tools.ts`:

- **BROWSER_TOOLS**: All available tools requiring a Playwright browser instance (navigate, click, screenshot, inspect_dom, etc.)

All browser tools extend `BrowserToolBase` (`src/tools/browser/base.ts`) which provides:
- `safeExecute()`: Wrapper with browser connection validation and error handling
- `ensurePage()` and `validatePageAvailable()`: Page availability checks
- `normalizeSelector()`: Converts test ID shortcuts to full selectors (e.g., `testid:foo` → `[data-testid="foo"]`)
- Automatic browser state reset on disconnection errors

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
├── tools.ts                # Tool definitions and categorization
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
1. All tools are browser automation tools (BROWSER_TOOLS)
2. Extend `BrowserToolBase` for browser tools
3. Add tool definition to `createToolDefinitions()` in `src/tools.ts`
4. Add case to switch statement in `handleToolCall()` in `src/toolHandler.ts`
5. Initialize tool instance in `initializeTools()` function
6. Add tests in `src/__tests__/tools/browser/`

### Tool Design Best Practices

When designing new tools, follow these principles (see `TOOL_DESIGN_PRINCIPLES.md` for details):

#### Core Design
- **Atomic operations**: Each tool does ONE thing
- **Minimal parameters**: Aim for 1-3 parameters, max 5
- **Primitive types**: Use strings, numbers, booleans over nested objects
- **Flat returns**: Minimize nesting in response structures
- **Single selector parameter**: Use `normalizeSelector()` to support shortcuts like `testid:foo`
- **Clear naming**: Tool name should describe what it returns

#### Documentation (CRITICAL)
**Principle #13: Explicit Output Documentation** - The tool description MUST explicitly list ALL possible outputs, even conditional ones.

❌ **Bad (Vague):**
```typescript
description: "Shows layout properties for ancestors"
// LLMs don't know what "layout properties" means!
```

✅ **Good (Explicit):**
```typescript
description: "Shows for each ancestor: position/size, width constraints (w, max-w, min-w), margins with arrows (↑↓←→), padding, display type, borders, overflow (🔒=hidden, ↕️=scroll), flexbox context (flex direction justify items gap), grid context (cols rows gap), position/z-index/transform when set. Detects centering and flags clipping (🎯)."
// LLMs know EXACTLY what information they'll receive!
```

**Guidelines:**
1. **List all outputs explicitly** - Don't use vague terms like "layout properties" or "relevant CSS"
2. **Indicate conditionals** - Use "when set", "if parent is flex", etc.
3. **Use same symbols as output** - If output uses ↑↓←→, mention it in description
4. **Include diagnostics** - Mention what insights/warnings the tool provides
5. **Keep under 500 chars** - Balance completeness with brevity

**Real-World Example:**
The `inspect_ancestors` tool captured flexbox/grid/z-index conditionally, but the description said "layout-critical CSS" (vague). Users thought features were missing. After updating to explicitly list "flexbox context, grid context, z-index when set", the tool became immediately more useful WITHOUT any code changes.

**Template:**
```
PRIMARY PURPOSE: Action verb. Shows: explicit list (output1, output2 when condition, output3 format). Detects/flags: diagnostics. Essential for: use cases. Default: N, max: M.
```

### Selector Shortcuts

All browser tools support test ID shortcuts via `normalizeSelector()`:
- `testid:submit-button` → `[data-testid="submit-button"]`
- `data-test:login-form` → `[data-test="login-form"]`
- `data-cy:username` → `[data-cy="username"]`
- Regular CSS selectors pass through unchanged

### DOM Inspection Tool

The `inspect_dom` tool is the **primary tool for understanding page structure**. Key features:

**Semantic Filtering** - Automatically shows only meaningful elements:
- Semantic HTML: `header`, `nav`, `main`, `article`, `section`, `aside`, `footer`, `form`, `button`, `input`, `select`, `textarea`, `a`, `h1-h6`, `p`, `ul`, `ol`, `li`, `table`, `img`, `video`, `audio`, `svg`, `canvas`, `iframe`, `dialog`, `details`, `summary`
- Elements with test IDs: `data-testid`, `data-test`, `data-cy`
- Elements with ARIA roles
- Interactive elements: `onclick`, `contenteditable`

**Automatic Wrapper Drilling** - Recursively drills through non-semantic wrappers (div, span, fieldset, etc.) up to `maxDepth` levels (default: 5) to find semantic children. This handles deeply nested UI framework components (Material-UI, Ant Design, Chakra UI).

**Parameters**:
- `selector` (optional): CSS selector or testid shorthand. Omit for page overview (defaults to body).
- `includeHidden` (optional, default: false): Include hidden elements in results
- `maxChildren` (optional, default: 20): Maximum number of children to show
- `maxDepth` (optional, default: 5): Maximum depth to drill through non-semantic wrapper elements. Increase for extremely deeply nested components, decrease to 1 to see only immediate children without drilling.

**Progressive Workflow**:
1. `inspect_dom({})` → See page sections (header, main, footer)
2. `inspect_dom({ selector: "main" })` → See main content children
3. `inspect_dom({ selector: "testid:login-form" })` → See form fields
4. Use selectors from output with interaction tools (click, fill, etc.)
