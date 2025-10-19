# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Model Context Protocol (MCP) server that provides browser automation capabilities using Playwright. It enables LLMs to interact with web pages, take screenshots, execute JavaScript, and perform HTTP requests through a set of MCP tools.

Server name: `playwright-mcp` (important for tool name length constraints - some clients like Cursor have a 60-character limit for `server_name:tool_name`)

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

### Running Evals
The evals package loads an MCP client that runs index.ts directly (no rebuild needed between tests):
```bash
OPENAI_API_KEY=your-key npx mcp-eval src/evals/evals.ts src/tools/codegen/index.ts
```

## Available Tools

### Browser Tools

#### Navigation & Interaction
- `playwright_navigate` - Navigate to a URL (supports chromium/firefox/webkit, viewport config, headless mode)
- `playwright_click` - Click an element
- `playwright_iframe_click` - Click an element inside an iframe
- `playwright_fill` - Fill an input field
- `playwright_iframe_fill` - Fill an input field inside an iframe
- `playwright_select` - Select from dropdown
- `playwright_hover` - Hover over an element
- `playwright_upload_file` - Upload file to input[type='file']
- `playwright_go_back` - Navigate back in history
- `playwright_go_forward` - Navigate forward in history
- `playwright_drag` - Drag element to target location
- `playwright_press_key` - Press keyboard key
- `playwright_click_and_switch_tab` - Click link and switch to new tab

#### Element Inspection & Debugging
- `playwright_inspect_dom` - **PRIMARY TOOL** - Progressive DOM inspection with semantic filtering, automatic wrapper drilling (maxDepth: 5 default), and spatial layout detection. Returns only meaningful elements (semantic HTML, test IDs, ARIA roles, interactive elements) while skipping non-semantic wrappers. Supports visual content (svg, canvas, audio, iframe). Use for understanding page structure.
- `playwright_get_test_ids` - Discover all test identifiers on the page (data-testid, data-test, data-cy, etc.). Returns compact text list grouped by attribute type. Essential for test-driven workflows.
- `playwright_query_selector_all` - Test a selector and return detailed information about all matched elements. Essential for selector debugging and finding the right element to interact with. Returns compact text format with element tag, position, text content, visibility status, and diagnostic info (display:none, opacity:0, zero size). Supports testid shortcuts and limit parameter (default: 10).
- `playwright_element_visibility` - Check if element is visible with detailed diagnostics (viewport, clipping, coverage, scroll needed)
- `playwright_element_position` - Get element position and size (x, y, width, height, viewport status)
- `playwright_find_by_text` - Find elements by text content (partial or exact match, case-sensitive/insensitive). Essential for pages without test IDs. Returns elements with position, visibility, and interaction state.
- `playwright_get_computed_styles` - Get computed CSS styles for an element. Returns styles grouped by category (Layout, Visibility, Spacing, Typography). Useful for debugging layout issues and understanding why elements behave unexpectedly.
- `playwright_element_exists` - Ultra-lightweight existence check (< 50 chars response). Returns ✓ exists or ✗ not found. Most common check before interaction.

#### Content Extraction
- `playwright_screenshot` - Take screenshots (full page or element, base64 or PNG file)
- `playwright_get_visible_text` - Get visible text content of page
- `playwright_get_visible_html` - Get HTML content (with script/comment/style removal options)
- `playwright_save_as_pdf` - Save page as PDF

#### JavaScript & Console
- `playwright_evaluate` - Execute JavaScript in browser console
- `playwright_console_logs` - Retrieve browser console logs (with filtering by type/search/limit)

#### Network & Responses
- `playwright_expect_response` - Start waiting for HTTP response
- `playwright_assert_response` - Validate previously initiated HTTP response wait

#### Configuration
- `playwright_custom_user_agent` - Set custom User Agent
- `playwright_close` - Close browser and release resources

### API Tools (HTTP Requests)
- `playwright_get` - HTTP GET request
- `playwright_post` - HTTP POST request (with body, token, custom headers)
- `playwright_put` - HTTP PUT request
- `playwright_patch` - HTTP PATCH request
- `playwright_delete` - HTTP DELETE request

### Code Generation Tools
- `start_codegen_session` - Start recording Playwright actions for test generation
- `end_codegen_session` - End session and generate Playwright test file
- `get_codegen_session` - Get session information
- `clear_codegen_session` - Clear session without generating test

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
   - Handles browser/API context setup based on tool requirements
   - Integrates with ActionRecorder for codegen sessions
   - Contains browser cleanup and error recovery logic

### Tool Organization

Tools are organized into three categories defined in `src/tools.ts`:

- **BROWSER_TOOLS**: Tools requiring a Playwright browser instance (navigate, click, screenshot, etc.)
- **API_TOOLS**: HTTP request tools using Playwright's API request context (GET, POST, PUT, PATCH, DELETE)
- **CODEGEN_TOOLS**: Test generation session management (start, end, get, clear)

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

### Code Generation (Codegen)

The codegen system (`src/tools/codegen/`) records Playwright actions and generates test files:

- **ActionRecorder** (`recorder.ts`): Singleton tracking active sessions and recording actions
- **PlaywrightGenerator** (`generator.ts`): Converts recorded actions to Playwright test code
- **Codegen Tools** (`index.ts`): MCP tools for session management (start/end/get/clear)

Sessions store:
- Unique sessionId
- CodegenOptions (outputPath, testNamePrefix, includeComments)
- Recorded actions array
- Timestamps

Generated tests are written to the configured outputPath as executable Playwright tests.

### File Structure

```
src/
├── index.ts                 # MCP server entry point
├── requestHandler.ts        # MCP protocol handlers
├── toolHandler.ts          # Tool execution dispatcher, browser state
├── tools.ts                # Tool definitions and categorization
├── tools/
│   ├── common/types.ts     # Shared interfaces (ToolContext, ToolResponse)
│   ├── browser/            # Browser automation tools
│   │   ├── base.ts         # BrowserToolBase class with normalizeSelector()
│   │   ├── interaction.ts  # Click, fill, select, hover, etc.
│   │   ├── navigation.ts   # Navigate, go back/forward
│   │   ├── screenshot.ts   # Screenshot tool
│   │   ├── console.ts      # Console logs retrieval
│   │   ├── visiblePage.ts  # Get visible text/HTML
│   │   ├── output.ts       # PDF generation
│   │   ├── elementInspection.ts  # Element visibility and position tools
│   │   └── ...
│   ├── api/                # HTTP request tools
│   │   ├── base.ts         # Base API tool class
│   │   └── requests.ts     # GET, POST, PUT, PATCH, DELETE
│   └── codegen/            # Test generation
│       ├── recorder.ts     # Action recording
│       ├── generator.ts    # Playwright test code generation
│       ├── index.ts        # Codegen tool definitions
│       └── types.ts        # Codegen interfaces
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
1. Choose appropriate category (BROWSER_TOOLS, API_TOOLS, or CODEGEN_TOOLS)
2. Extend `BrowserToolBase` for browser tools or `ApiToolBase` for API tools
3. Add tool definition to `createToolDefinitions()` in `src/tools.ts`
4. Add case to switch statement in `handleToolCall()` in `src/toolHandler.ts`
5. Initialize tool instance in `initializeTools()` function
6. Add tests in `src/__tests__/tools/` matching the tool category

### Tool Design Best Practices

When designing new tools, follow these principles (see `TOOL_DESIGN_PRINCIPLES.md` for details):
- **Atomic operations**: Each tool does ONE thing
- **Minimal parameters**: Aim for 1-3 parameters, max 5
- **Primitive types**: Use strings, numbers, booleans over nested objects
- **Flat returns**: Minimize nesting in response structures
- **Single selector parameter**: Use `normalizeSelector()` to support shortcuts like `testid:foo`
- **Clear naming**: Tool name should describe what it returns

### Selector Shortcuts

All browser tools support test ID shortcuts via `normalizeSelector()`:
- `testid:submit-button` → `[data-testid="submit-button"]`
- `data-test:login-form` → `[data-test="login-form"]`
- `data-cy:username` → `[data-cy="username"]`
- Regular CSS selectors pass through unchanged

### DOM Inspection Tool

The `playwright_inspect_dom` tool is the **primary tool for understanding page structure**. Key features:

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
1. `playwright_inspect_dom({})` → See page sections (header, main, footer)
2. `playwright_inspect_dom({ selector: "main" })` → See main content children
3. `playwright_inspect_dom({ selector: "testid:login-form" })` → See form fields
4. Use selectors from output with interaction tools (click, fill, etc.)
