# Web Inspector MCP 🔍

> **Give LLMs visual superpowers to see, debug, and test any web page.**

A Model Context Protocol (MCP) server that provides comprehensive web inspection and debugging capabilities. Built on Playwright, it enables AI assistants to deeply understand web page structure, debug element visibility issues, validate layouts, and inspect DOM in real browser environments.

## Why Web Inspector MCP?

Modern web applications are complex. Elements are hidden, layouts break, selectors fail, and debugging feels like detective work. **Web Inspector MCP** gives your AI assistant the tools to:

- 🔍 **Understand any page structure** - Progressive DOM inspection that drills through wrapper divs to find semantic elements
- 🎯 **Debug visibility issues** - Detailed diagnostics showing exactly why clicks fail (clipped, covered, scrolled out of view)
- 📐 **Validate layouts** - Compare element positions to ensure consistent alignment and spacing
- 🧪 **Test selector reliability** - See all matching elements with their visibility status before writing tests
- 🎨 **Inspect styles** - Get computed CSS to understand why elements behave unexpectedly
- 📝 **Find elements without IDs** - Locate elements by text content when test IDs aren't available

## Perfect For

- **QA Engineers** - Debug failing automated tests and understand why selectors break
- **Frontend Developers** - Investigate layout issues and CSS problems across browsers
- **Test Automation** - Build robust selectors and validate page structure before writing tests
- **Accessibility Audits** - Inspect ARIA roles, semantic HTML, and element visibility
- **Web Scraping** - Understand page structure and find the right selectors for data extraction

## Installation

**No manual installation required!** Your AI coding assistant will automatically install the server via `npx` when configured.

If you prefer global installation for faster startup:
```bash
npm install -g mcp-web-inspector
```

---

## AI Tool Setup

All configurations below use `npx` which automatically downloads and runs the latest version. Click to expand installation instructions for your AI tool:

<details>
<summary><b>🤖 Claude Code (CLI)</b></summary>

### Installation via CLI

```bash
# Add MCP server using Claude Code CLI
claude mcp add web-inspector --scope user -- npx -y mcp-web-inspector

# Verify installation
claude mcp list
```

### Manual Configuration

Edit `~/.config/claude/mcp.json` (Linux/macOS) or `%APPDATA%\Claude\mcp.json` (Windows):

```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector"]
    }
  }
}
```

After installation, restart Claude Code to load the server.

</details>

<details>
<summary><b>💻 Claude Desktop</b></summary>

### Configuration File Location

- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Add to Configuration

```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector"]
    }
  }
}
```

Restart Claude Desktop after saving the configuration.

</details>

<details>
<summary><b>🔷 VS Code with GitHub Copilot</b></summary>

### Prerequisites

- VS Code version 1.101 or later
- GitHub Copilot extension installed

### Installation via CLI

```bash
# VS Code Stable
code --add-mcp '{"name":"web-inspector","command":"npx","args":["mcp-web-inspector"]}'

# VS Code Insiders
code-insiders --add-mcp '{"name":"web-inspector","command":"npx","args":["mcp-web-inspector"]}'
```

### Manual Configuration

1. Open VS Code Settings (JSON)
2. Add MCP server configuration to `mcp.json`:

```json
{
  "servers": {
    "web-inspector": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-web-inspector"]
    }
  }
}
```

### Enable MCP in VS Code

1. Open VS Code Settings (UI)
2. Search for "MCP"
3. Enable **Chat > MCP** option
4. MCP only works in **Agent mode** - switch to agent mode in the chat interface
5. Open the `mcp.json` file and click the **"Start"** button next to the server

### Note about Embedded Browser

GitHub Copilot and VS Code may have an embedded browser feature. If you experience conflicts or prefer using Web Inspector MCP for all web inspection tasks, you may want to disable the built-in browser:

1. Open VS Code Settings
2. Search for "browser preview" or "simple browser"
3. Disable relevant browser-related extensions if needed

Web Inspector MCP provides more powerful inspection capabilities than the embedded browser.

</details>

<details>
<summary><b>🎯 Cursor</b></summary>

### Configuration File Location

- **MacOS/Linux**: `~/.cursor/mcp.json` or check Cursor's settings directory
- **Windows**: `%APPDATA%\Cursor\mcp.json`

### Add to Configuration

```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector"]
    }
  }
}
```

### Steps

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Search for "MCP" settings
3. Edit the MCP configuration file
4. Add the web-inspector server configuration
5. Restart Cursor
6. Verify the server is available in the MCP panel

</details>

<details>
<summary><b>🌊 Windsurf</b></summary>

### Configuration

Windsurf uses the same configuration format as Claude Desktop. You can literally copy your Claude Desktop config!

**Configuration File**: Check Windsurf's settings for the exact path (typically in app data directory)

```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector"]
    }
  }
}
```

### Steps

1. Open Windsurf settings
2. Navigate to MCP configuration
3. Add the web-inspector server
4. Restart Windsurf
5. Verify server availability in the tools panel

Windsurf handles MCP tools very well - configuration is straightforward!

</details>

<details>
<summary><b>🔧 Cline (VS Code Extension)</b></summary>

### Prerequisites

- VS Code with Cline extension installed
- Node.js installed on your system

### Configuration

1. Open Cline's settings in VS Code
2. Locate the MCP configuration section
3. Add the server configuration:

```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector"]
    }
  }
}
```

4. Restart VS Code or reload the Cline extension
5. The Web Inspector MCP tools will be available in Cline's tool panel

</details>

<details>
<summary><b>⚙️ Other MCP-Compatible Tools</b></summary>

Most MCP-compatible tools use a similar configuration format. Look for:

1. MCP settings or configuration file
2. Server/Tools configuration section
3. Add the standard configuration:

```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector"]
    }
  }
}
```

If your tool supports MCP but isn't listed here, consult its documentation for the exact configuration file location.

</details>

---

## Command Line Options

Web Inspector MCP supports command line flags to customize behavior:

### `--no-save-session`

Disable automatic session persistence. By default, browser sessions (cookies, localStorage, sessionStorage) are saved. Use this flag to start with a fresh browser state each time.

**Example Configuration:**

```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector", "--no-save-session"]
    }
  }
}
```

**When to use:**
- Testing with clean state required for each session
- Avoiding interference from previous test data
- Privacy-sensitive testing scenarios

---

## Session Persistence

**By default**, browser session data (cookies, localStorage, sessionStorage) is automatically saved and persists across browser restarts. No configuration needed!

### How It Works

- Session data is saved in `./.mcp-web-inspector/` directory
- Browser maintains logged-in state between sessions
- Works out of the box - just navigate and your sessions are saved

### Benefits

- ✅ Test authenticated features without re-logging in each time
- ✅ Maintain shopping cart state across sessions
- ✅ Preserve user preferences and settings
- ✅ Debug logged-in user workflows efficiently

### Disabling Session Persistence

If you prefer the browser to start fresh each time (no persistent state), use the `--no-save-session` flag:

**Claude Code CLI:**
```bash
claude mcp add web-inspector --scope user -- npx -y mcp-web-inspector --no-save-session
```

**Claude Desktop / Windsurf / Cline:**
```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector", "--no-save-session"]
    }
  }
}
```

**Cursor:**
```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector", "--no-save-session"],
      "env": {}
    }
  }
}
```

### Clearing Saved Sessions

To clear saved session data, simply delete the directory:
```bash
rm -rf ./.mcp-web-inspector
```

---

## Core Tools

### 🔍 DOM Inspection & Discovery

#### `inspect_dom` ⭐ **PRIMARY TOOL**
Progressive DOM inspection with semantic filtering and automatic wrapper drilling. Returns only meaningful elements (semantic HTML, test IDs, ARIA roles, interactive elements) while automatically skipping non-semantic wrapper divs.

**Key Features:**
- Drills through nested wrapper elements (up to 5 levels deep by default)
- Shows spatial layout information (position, size, visibility)
- Detects layout patterns automatically
- Supports progressive exploration (inspect → drill down → inspect children)

**Use Cases:**
- Understanding page structure at a glance
- Finding semantic landmarks (header, main, nav, footer)
- Discovering interactive elements in complex UIs
- Navigating deeply nested component libraries (Material-UI, Ant Design)

**Example Workflow:**
```
1. inspect_dom({})                          → See page sections
2. inspect_dom({ selector: "main" })        → Explore main content
3. inspect_dom({ selector: "[role=form]" }) → Inspect form fields
```

#### `get_test_ids`
Discover all test identifiers on the page (data-testid, data-test, data-cy, etc.). Returns a compact list grouped by attribute type.

**Use Cases:**
- Finding elements with test IDs for reliable selectors
- Auditing test coverage
- Understanding naming conventions used in the codebase

#### `query_selector`
Test a selector and get detailed information about all matched elements. Shows tag, position, text content, visibility status, and why elements are hidden (display:none, opacity:0, zero size).

**Use Cases:**
- Debugging why selectors match unexpected elements
- Validating selector specificity before writing tests
- Finding the right element among multiple matches
- Understanding element state (visible, hidden, interactive)

**Parameters:**
- `limit` - Control how many matches to show (default: 10)
- `onlyVisible` - Filter by visibility (true/false/undefined)
- `showAttributes` - Display specific HTML attributes

### 👁️ Visibility & Position Debugging

#### `check_visibility`
Detailed visibility diagnostics showing exactly why elements are or aren't visible. Checks viewport intersection, clipping by overflow:hidden, coverage by other elements, and scroll requirements.

**Use Cases:**
- Debugging why clicks fail ("element not visible")
- Understanding if scrolling is needed
- Detecting elements covered by modals or overlays
- Checking if elements are clipped by parent containers

#### `get_position`
Get precise element coordinates and dimensions (x, y, width, height). Shows position relative to viewport.

**Use Cases:**
- Finding exact click coordinates
- Checking element layout
- Calculating distances between elements
- Debugging overlapping elements

#### `compare_positions`
Compare positions and alignment of two elements. Validates if elements are aligned (top, left, right, bottom) or have matching dimensions (width, height).

**Use Cases:**
- Visual regression testing
- Ensuring consistent spacing across components
- Validating grid layouts
- Checking responsive design consistency

### 🎨 Style & Content Inspection

#### `get_styles`
Get computed CSS styles for an element, grouped by category (Layout, Visibility, Spacing, Typography). Request specific properties or get common layout properties.

**Use Cases:**
- Understanding why elements behave unexpectedly
- Debugging layout issues (flexbox, grid, positioning)
- Investigating rendering differences across browsers
- Finding actual rendered values (not CSS source)

#### `get_text`
Extract visible text content from the current page or specific element.

**Use Cases:**
- Content validation
- Scraping visible text
- Verifying page loaded correctly

#### `get_html`
Get HTML content with options to remove scripts, comments, styles, and meta tags. Supports minification and max length limits.

**Use Cases:**
- Analyzing page structure
- Extracting clean HTML for processing
- Debugging server-rendered content

#### `get_console_logs`
Retrieve browser console logs with filtering by type (error, warning, log, info, debug) and text search.

**Use Cases:**
- Debugging JavaScript errors
- Monitoring network issues
- Finding specific log messages
- Tracking console warnings

### 🔎 Element Finding & Validation

#### `find_by_text`
Find elements by text content with exact/partial matching, case sensitivity options, and regex support.

**Use Cases:**
- Finding buttons without test IDs ("Click here", "Submit")
- Locating elements in pages with poor markup
- Searching for dynamic content
- Testing internationalized content

**Regex Examples:**
- `/sign.*in/i` - Case-insensitive "sign in" variations
- `/\d+ items?/` - Numbers followed by "item" or "items"

#### `element_exists`
Ultra-lightweight existence check. Returns simple ✓ exists or ✗ not found status.

**Use Cases:**
- Quick pre-interaction validation
- Polling for element appearance
- Conditional logic based on element presence

### 🌐 Navigation & Control

#### `navigate`
Navigate to a URL with full browser configuration options.

**Parameters:**
- `browserType` - chromium, firefox, or webkit
- `width`, `height` - Viewport dimensions
- `headless` - Run in headless mode
- `timeout` - Navigation timeout
- `waitUntil` - Navigation wait condition

#### `go_back`
Navigate back in browser history. Essential for testing navigation flows and multi-step forms.

**Use Cases:**
- Testing back button behavior
- Debugging navigation state
- Verifying history management
- Testing multi-page workflows

#### `go_forward`
Navigate forward in browser history.

**Use Cases:**
- Testing forward navigation
- Verifying browser history state
- Debugging navigation flows

#### `screenshot`
Capture screenshots of the entire page or specific elements. Save as PNG file or return as base64.

**Options:**
- Full page screenshots
- Element-specific screenshots
- Custom viewport sizes
- Save to custom directory

#### `close`
Close the browser and release all resources.

### 🎯 Essential Interactions (for Debugging Workflows)

#### `click`
Click an element on the page. Essential for debugging user workflows and testing interactive elements.

**Use Cases:**
- Testing button functionality
- Triggering dropdown menus
- Debugging click event handlers
- Simulating user interactions during inspection

#### `fill`
Fill out an input field with text. Critical for debugging form interactions.

**Use Cases:**
- Testing form validation
- Debugging input field behavior
- Simulating user data entry
- Testing autocomplete and search features

#### `hover`
Hover over an element to trigger hover states and tooltips.

**Use Cases:**
- Debugging CSS :hover states
- Triggering tooltip displays
- Testing dropdown menu visibility
- Inspecting hover-dependent UI elements

#### `select`
Select an option from a `<select>` dropdown element.

**Use Cases:**
- Testing dropdown functionality
- Debugging option selection
- Simulating user form completion
- Testing dependent field updates

#### `upload_file`
Upload a file to an `input[type='file']` element.

**Use Cases:**
- Testing file upload functionality
- Debugging file input behavior
- Simulating document/image uploads
- Testing upload validation

#### `drag`
Drag an element from source to target location.

**Use Cases:**
- Testing drag-and-drop interfaces
- Debugging sortable lists
- Testing reorderable components
- Validating drag interactions

#### `press_key`
Press a keyboard key, optionally focusing on a specific element first.

**Use Cases:**
- Testing keyboard shortcuts
- Debugging keyboard navigation
- Testing Enter/Escape key handlers
- Simulating Tab key navigation

### ⚙️ Advanced Tools

#### `evaluate`
Execute JavaScript code in the browser console and return the result.

**Use Cases:**
- Running custom JavaScript for debugging
- Extracting complex data not available via other tools
- Testing JavaScript functions on the page
- Manipulating page state for testing

**Example:**
```javascript
evaluate({ script: "return document.title" })
evaluate({ script: "return Array.from(document.querySelectorAll('a')).length" })
```

## Selector Shortcuts

All tools support test ID shortcuts for cleaner syntax:

- `testid:submit-button` → `[data-testid="submit-button"]`
- `data-test:login-form` → `[data-test="login-form"]`
- `data-cy:username` → `[data-cy="username"]`

Regular CSS selectors work unchanged.

## Example Use Cases

### Debugging a Failing Test
```
1. navigate({ url: "https://example.com" })
2. query_selector({ selector: ".submit-button", limit: 5 })
   → Found 3 matches, 2 are hidden (display:none)
3. check_visibility({ selector: ".submit-button:nth-child(1)" })
   → Element is clipped by parent overflow:hidden
4. get_position({ selector: ".submit-button:nth-child(1)" })
   → Element is at x:1500, y:300 (outside viewport)
```

### Understanding Page Structure
```
1. navigate({ url: "https://app.example.com" })
2. inspect_dom({})
   → Shows: header, nav, main, aside, footer
3. inspect_dom({ selector: "main" })
   → Shows: form[role=search], section.results, section.filters
4. get_test_ids({})
   → Discovers: search-input, filter-dropdown, result-card
```

### Validating Layout Consistency
```
1. navigate({ url: "https://dashboard.example.com" })
2. compare_positions({
     selector1: "testid:main-header",
     selector2: "testid:chat-header",
     checkAlignment: "top"
   })
   → ✓ Aligned (difference: 0px)
3. compare_positions({
     selector1: ".card:nth-child(1)",
     selector2: ".card:nth-child(2)",
     checkAlignment: "width"
   })
   → ✗ Not aligned (difference: 15px)
```

### Finding Elements Without Test IDs
```
1. find_by_text({ text: "Add to Cart", exact: false })
   → Found 1 element: button.primary-action
2. get_styles({
     selector: "button.primary-action",
     properties: "background-color,padding,font-size"
   })
   → Shows: background-color: rgb(0,123,255), padding: 12px 24px
```

## Development

### Testing
```bash
npm test              # Run tests
npm run test:coverage # Run with coverage
```

### Building
```bash
npm run build  # Compile TypeScript
npm run watch  # Watch mode for development
```

## Technical Details

- **Protocol**: Model Context Protocol (MCP)
- **Browser Engine**: Playwright (Chromium, Firefox, WebKit)
- **Language**: TypeScript
- **Node Version**: 20+

## Contributing

Contributions welcome! When adding new tools:

1. Keep tool names short (some clients limit `server_name:tool_name` to 60 chars)
2. Follow the atomic operation principle (one tool, one purpose)
3. Use flat parameter structures with primitive types
4. Add tests in `src/__tests__/`

## License

MIT

## Links

- **GitHub**: https://github.com/antonzherdev/mcp-web-inspector
- **npm**: https://www.npmjs.com/package/mcp-web-inspector
- **Issues**: https://github.com/antonzherdev/mcp-web-inspector/issues

## Credits

This project is a focused fork of [executeautomation/mcp-playwright](https://github.com/executeautomation/mcp-playwright), specializing in web inspection and debugging capabilities. We're grateful to the ExecuteAutomation team for creating the excellent foundation that made this project possible.

**Key Differences:**
- **Web Inspector MCP**: Focused on inspection, debugging, and layout validation with clean tool names
- **Original mcp-playwright**: Full-featured browser automation including code generation, API testing, and comprehensive interaction tools

If you need full Playwright automation capabilities (code generation, advanced interactions, API testing), check out the [original mcp-playwright server](https://github.com/executeautomation/mcp-playwright).

---

**Made for AI-assisted web development and testing** 🤖
