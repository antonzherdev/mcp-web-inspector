# Web Inspector MCP 🔍

> **Give LLMs visual superpowers to see, debug, and test any web page.**

A Model Context Protocol (MCP) server that provides comprehensive web inspection and debugging capabilities. Built on Playwright, it enables AI assistants to deeply understand web page structure, debug element visibility issues, validate layouts, and inspect DOM in real browser environments.

## Why Web Inspector MCP?

Modern web applications are complex. Elements are hidden, layouts break, selectors fail, and debugging feels like detective work. **Web Inspector MCP** gives your AI assistant the tools to:

- 🔍 **Understand any page structure** - Progressive DOM inspection that drills through wrapper divs to find semantic elements
- 🎯 **Debug visibility issues** - Detailed diagnostics showing exactly why clicks fail (clipped, covered, scrolled out of view)
- 🔼 **Trace layout constraints** - Walk up the DOM tree to find where unexpected margins, width limits, and overflow clipping come from
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
<summary><b>🚀 Codex CLI</b></summary>

### Installation via CLI

```bash
# Add the server globally
codex mcp add web-inspector -- npx -y mcp-web-inspector

# Verify it was registered
codex mcp list
```

### Manual Configuration

Codex stores MCP server definitions in `~/.codex/config.toml`. Add (or create) an entry under the `[mcp.servers]` table:

```toml
[mcp.servers.web-inspector]
command = "npx"
args = ["-y", "mcp-web-inspector"]
```

Restart Codex CLI to make sure the new server is available in future sessions.

</details>

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
code --add-mcp '{"name":"web-inspector","command":"npx","args":["-y","mcp-web-inspector"]}'

# VS Code Insiders
code-insiders --add-mcp '{"name":"web-inspector","command":"npx","args":["-y","mcp-web-inspector"]}'
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

### First-Time Browser Setup

When you first use the server with `npx`, Playwright browsers will be **automatically installed** on first tool use if not already present. The installation happens once and browsers are stored in your home directory, shared across all projects.

If automatic installation doesn't work (firewall, permissions, etc.), you'll see clear instructions to run:
```bash
npx playwright install chromium firefox webkit
```

Then restart VS Code to use the server.

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

CLI-first assistants such as GitHub Copilot CLI, Copylot CLI, Continue CLI, and other emerging AI coders follow the same pattern—either run their `mcp add` command with `npx -y mcp-web-inspector` or drop the snippet above into their MCP config file.

If your tool supports MCP but isn't listed here, consult its documentation for the exact configuration file location.

</details>

---

## Command Line Options

Customize server behavior with command line flags:

- **`--no-save-session`** - Disable automatic session persistence (start with fresh browser state each time)
- **`--user-data-dir <path>`** - Custom directory for session data (default: `./.mcp-web-inspector`)
- **`--headless`** - Run browser in headless mode by default (no visible window)

**Example usage:**
```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector", "--user-data-dir", "./my-sessions"]
    }
  }
}
```

**Run in headless mode for automation/CI:**
```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector", "--headless"]
    }
  }
}
```

**Combine multiple flags:**
```json
{
  "mcpServers": {
    "web-inspector": {
      "command": "npx",
      "args": ["-y", "mcp-web-inspector", "--headless", "--no-save-session"]
    }
  }
}
```

---

## Session Persistence & Data Storage

**By default**, browser session data and screenshots are automatically saved and organized in `./.mcp-web-inspector/`:

```
.mcp-web-inspector/
  ├── user-data/       # Browser sessions (cookies, localStorage, sessionStorage)
  └── screenshots/     # Screenshot files
```

### How It Works

- Session data persists across browser restarts
- Screenshots are saved to the screenshots directory
- Browser maintains logged-in state between sessions
- Works out of the box - just navigate and your data is saved

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

### Clearing Data

To clear all saved data (sessions and screenshots):
```bash
rm -rf ./.mcp-web-inspector
```

To clear only sessions or screenshots:
```bash
rm -rf ./.mcp-web-inspector/user-data      # Clear sessions only
rm -rf ./.mcp-web-inspector/screenshots    # Clear screenshots only
```

### Security Best Practices

**⚠️ IMPORTANT**: Add `.mcp-web-inspector/` to your `.gitignore` file to prevent committing:
- Browser session data (cookies, localStorage, sessionStorage)
- Saved screenshots (may contain sensitive information)
- Authentication tokens and credentials

**Add to your `.gitignore`:**
```gitignore
# MCP Web Inspector data
.mcp-web-inspector/
```

**Why this matters:**
- Session data contains cookies and authentication tokens
- Screenshots may capture sensitive user data
- Committing this data could leak credentials to your repository
- Session files can be large and bloat your git history

**Best practices:**
- **Default is visible browser** (`headless: false`) for interactive debugging
- Use `headless: true` explicitly for automation and CI/CD environments
- Clear session data after testing sensitive applications
- Use `--no-save-session` flag when testing on shared/public sites

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

#### `compare_positions`
Compare positions and alignment of two elements. Validates if elements are aligned (top, left, right, bottom) or have matching dimensions (width, height).

**Use Cases:**
- Visual regression testing
- Ensuring consistent spacing across components
- Validating grid layouts
- Checking responsive design consistency

#### `inspect_ancestors` ⭐ **DEBUG LAYOUT CONSTRAINTS**
Walk up the DOM tree to find where width constraints, margins, borders, and overflow clipping come from. Shows position, size, and layout-critical CSS for each ancestor up to `<body>`.

**Key Features:**
- Default depth: 10 levels (reaches `<body>` in most React apps)
- Only shows non-default values (omits `border:none`, `overflow:visible`)
- Auto-detects overflow:hidden clipping, width constraints, auto-margin centering
- Token-efficient compact text format with diagnostic annotations (🎯⚠️)

**Use Cases:**
- Finding where unexpected margins come from (auto-centering)
- Discovering parent max-width constraints
- Locating overflow:hidden containers that clip elements
- Understanding why elements have constrained widths
- Debugging deeply nested component library layouts (Material-UI, Chakra, Ant Design)

**Example:**
```
inspect_ancestors({ selector: "testid:header" })
→ Shows: [0] header (896px, margins: 160px)
         [1] div (1216px, max-w constraint)
         [2] body (1920px, overflow-x: hidden)
   🎯 WIDTH CONSTRAINT found at parent
   ⚠ Auto margins centering (160px each side)
```

### 🎨 Style & Content Inspection

#### `get_computed_styles`
Get computed CSS styles for an element, grouped by category (Layout, Visibility, Spacing, Typography). Request specific properties or get common layout properties.

**Use Cases:**
- Understanding why elements behave unexpectedly
- Debugging CSS property values (flexbox, grid, positioning)
- Investigating rendering differences across browsers
- Finding actual rendered values (not CSS source)

#### `measure_element`
Get box model measurements (position, size, margin, padding, border) with compact visual representation using directional arrows.

**Use Cases:**
- Debugging CSS spacing issues
- Validating design system spacing tokens
- Understanding box model layout
- Checking margin/padding/border values

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
- `browserType` - chromium, firefox, or webkit (default: chromium)
- `width`, `height` - Viewport dimensions (default: auto-detected screen size)
- `headless` - Run in headless mode (default: **false** - browser window visible)
- `timeout` - Navigation timeout in ms (default: 30000)
- `waitUntil` - Navigation wait condition (default: "load")

**Default Behavior:**
- Browser window is **visible by default** for interactive debugging
- Use `headless: true` for automation, CI/CD, or when you don't need visual feedback
- Use `headless: false` (or omit) when debugging interactively

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

## Selector Shortcuts ⭐ Time-Saver

All browser tools support **convenient test ID shortcuts** that save typing and improve readability:

| Shorthand | Expands to | Saved Characters |
|-----------|-----------|------------------|
| `testid:submit-button` | `[data-testid="submit-button"]` | 17 chars |
| `data-test:login-form` | `[data-test="login-form"]` | 11 chars |
| `data-cy:username` | `[data-cy="username"]` | 9 chars |

**Before (verbose):**
```javascript
click({ selector: '[data-testid="submit-button"]' })
fill({ selector: '[data-testid="email-input"]', value: 'user@example.com' })
check_visibility({ selector: '[data-testid="loading-spinner"]' })
```

**After (with shortcuts):**
```javascript
click({ selector: 'testid:submit-button' })
fill({ selector: 'testid:email-input', value: 'user@example.com' })
check_visibility({ selector: 'testid:loading-spinner' })
```

**Why this matters:**
- ✅ **Cleaner, more readable tool calls** - No need to escape quotes or remember bracket syntax
- ✅ **Works across all browser tools** - Consistent syntax for click, fill, inspect_dom, etc.
- ✅ **Mix with other selectors** - Regular CSS selectors still work: `#login`, `.button`, `nav > a`

**All supported shortcuts:**
- `testid:*` → `[data-testid="*"]`
- `data-test:*` → `[data-test="*"]`
- `data-cy:*` → `[data-cy="*"]` (Cypress convention)

Regular CSS selectors, text selectors (`text=Login`), and Playwright selectors work unchanged.

## Example Use Cases

### Debugging a Failing Test
```
1. navigate({ url: "https://example.com" })
2. query_selector({ selector: ".submit-button", limit: 5 })
   → Found 3 matches, 2 are hidden (display:none)
3. check_visibility({ selector: ".submit-button:nth-child(1)" })
   → Element is clipped by parent overflow:hidden
4. measure_element({ selector: ".submit-button:nth-child(1)" })
   → @ (1500,300) 100x40px (outside viewport)
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
2. get_computed_styles({
     selector: "button.primary-action",
     properties: "background-color,padding,font-size"
   })
   → Shows: background-color: rgb(0,123,255), padding: 12px 24px
```

## Cookbook: Common Workflows

These step-by-step recipes show how to chain tools together for common testing and debugging scenarios.

### Recipe 1: Testing a Login Flow

```
1. navigate({ url: "https://app.example.com/login" })
2. screenshot({ name: "login-page" })
3. fill({ selector: "testid:email-input", value: "user@example.com" })
4. fill({ selector: "testid:password-input", value: "password123" })
5. click({ selector: "testid:login-button" })
6. wait_for_network_idle()
7. get_console_logs({ type: "error" })
   → Verify no JavaScript errors occurred
8. screenshot({ name: "after-login" })
9. get_text()
   → Verify success message or dashboard content
```

**Why this works**: Session persistence means you stay logged in for subsequent tests.

### Recipe 2: Debugging Layout Issues

```
1. navigate({ url: "https://dashboard.example.com" })
2. inspect_dom({ selector: "testid:sidebar" })
   → Understand the structure of the problematic area
3. measure_element({ selector: "testid:logo" })
   → @ (20,10) 150x40px
4. measure_element({ selector: "testid:menu" })
   → @ (20,60) 200x300px
5. compare_positions({
     selector1: "testid:logo",
     selector2: "testid:menu",
     checkAlignment: "left"
   })
   → ✓ aligned (both at x=20)
6. get_computed_styles({
     selector: "testid:sidebar",
     properties: "margin,padding,display,flex-direction"
   })
   → Shows: display: flex, flex-direction: column, padding: 20px
7. screenshot({ name: "layout-debug" })
```

**Why this works**: Progressive inspection + precise measurements reveal layout problems.

### Recipe 2a: Finding Where Unexpected Margins Come From

```
1. navigate({ url: "https://app.example.com" })
2. inspect_dom({ selector: "main" })
   → Shows header element with test ID
3. measure_element({ selector: "testid:event-mode-header" })
   → @ (160,0) 896x56px
   → Margin: ←160px →160px (unexpected!)
   💡 Unexpected spacing detected. Check parent constraints
4. inspect_ancestors({ selector: "testid:event-mode-header" })
   → [0] <header testid:event-mode-header>
       @ (160,0) 896x56px | w:896px max-w:896px m:0 160px
       border-bottom: 1px solid #e5e7eb
       ⚠ Auto margins centering (160px each side)
   → [1] <div>
       @ (0,0) 1216x56px | w:1216px
   → [2] <div> flex max-w-[1600px]
       @ (352,60) 1216x900px
       max-width: 1600px
       🎯 WIDTH CONSTRAINT
5. Solution: Remove mx-auto from header (centering already handled by parent)
```

**Why this works**: `inspect_ancestors` traces the layout constraint chain to find the root cause of unexpected spacing in deeply nested React components.

### Recipe 3: API Response Testing

```
1. navigate({ url: "https://app.example.com/dashboard" })
2. click({ selector: "testid:refresh-button" })
3. wait_for_network_idle()
4. list_network_requests({ type: "fetch", limit: 10 })
   → [5] GET /api/users 200 OK | 45ms
5. get_request_details({ index: 5 })
   → Check headers, status, response body
6. get_console_logs({ type: "error" })
   → Verify no network errors
```

**Why this works**: Network tools capture all requests for inspection after interactions.

### Recipe 4: Finding Elements on Pages Without Test IDs

```
1. navigate({ url: "https://legacy-app.example.com" })
2. inspect_dom()
   → Get overall page structure
3. get_test_ids()
   → Check if any test IDs exist (spoiler: none)
4. find_by_text({ text: "submit", caseSensitive: false })
   → Found 2 buttons containing "submit"
5. query_selector({ selector: "button", onlyVisible: true, limit: 10 })
   → Shows all visible buttons with positions and text
6. element_exists({ selector: "button:has-text('Submit Form')" })
   → ✓ exists
7. click({ selector: "button:has-text('Submit Form')" })
```

**Why this works**: Multiple discovery tools (text search, query selector) help locate elements.

### Recipe 5: Debugging "Element Not Visible" Errors

```
1. navigate({ url: "https://app.example.com" })
2. element_exists({ selector: "testid:submit" })
   → ✓ exists
3. check_visibility({ selector: "testid:submit" })
   → ✗ not visible: clipped by parent overflow:hidden
4. inspect_dom({ selector: "form" })
   → See parent container structure
5. get_computed_styles({
     selector: "form",
     properties: "overflow,height,max-height"
   })
   → overflow: hidden, height: 300px, max-height: 300px
6. evaluate({ script: "document.querySelector('[data-testid=submit]').scrollIntoView()" })
   → Scroll element into view
7. check_visibility({ selector: "testid:submit" })
   → ✓ visible
8. click({ selector: "testid:submit" })
```

**Why this works**: Visibility diagnostics reveal the exact reason, enabling targeted fixes.

### Recipe 6: Visual Regression Testing

```
1. navigate({ url: "https://dashboard.example.com" })
2. screenshot({ name: "baseline", fullPage: true })
3. compare_positions({
     selector1: "testid:header",
     selector2: "testid:footer",
     checkAlignment: "width"
   })
   → ✓ aligned (both 1280px)
4. compare_positions({
     selector1: ".card:nth-child(1)",
     selector2: ".card:nth-child(2)",
     checkAlignment: "height"
   })
   → ✗ not aligned (difference: 20px)
5. measure_element({ selector: ".card:nth-child(1)" })
   → @ (20,100) 400x300px
6. measure_element({ selector: ".card:nth-child(2)" })
   → @ (440,100) 400x320px  ← 20px taller!
```

**Why this works**: Position comparison tools validate consistent spacing across components.

### Recipe 7: Form Validation Testing

```
1. navigate({ url: "https://app.example.com/signup" })
2. fill({ selector: "testid:email", value: "invalid-email" })
3. fill({ selector: "testid:password", value: "short" })
4. click({ selector: "testid:submit" })
5. wait_for_element({ selector: ".error-message", state: "visible", timeout: 5000 })
6. find_by_text({ text: "invalid", caseSensitive: false })
   → Found 2 elements: .error-message spans
7. get_text({ selector: ".error-message" })
   → "Please enter a valid email address"
8. screenshot({ name: "validation-errors" })
```

**Why this works**: Wait for element ensures validation messages appear before checking.

### Recipe 8: Mobile Responsive Testing

```
1. navigate({
     url: "https://app.example.com",
     width: 375,
     height: 667
   })
   → iPhone SE viewport
2. screenshot({ name: "mobile-view", fullPage: true })
3. inspect_dom({ selector: "nav" })
   → Check if mobile menu is used
4. element_exists({ selector: "testid:hamburger-menu" })
   → ✓ exists (mobile menu visible)
5. element_exists({ selector: "testid:desktop-menu" })
   → ✗ not found (desktop menu hidden on mobile)
6. click({ selector: "testid:hamburger-menu" })
7. wait_for_element({ selector: "testid:mobile-nav", state: "visible" })
8. screenshot({ name: "mobile-menu-open" })
```

**Why this works**: Viewport configuration in navigate enables mobile testing.

### Recipe 9: Debugging Hover States

```
1. navigate({ url: "https://app.example.com" })
2. hover({ selector: "testid:tooltip-trigger" })
3. wait_for_element({ selector: "testid:tooltip", state: "visible", timeout: 2000 })
4. check_visibility({ selector: "testid:tooltip" })
   → ✓ visible
5. measure_element({ selector: "testid:tooltip" })
   → @ (300,150) 200x50px
6. get_computed_styles({
     selector: "testid:tooltip",
     properties: "display,opacity,visibility,z-index"
   })
   → display: block, opacity: 1, visibility: visible, z-index: 1000
7. screenshot({ name: "tooltip-visible" })
```

**Why this works**: Hover tool + visibility checks validate tooltip behavior.

### Recipe 10: Accessibility Audit

```
1. navigate({ url: "https://app.example.com" })
2. inspect_dom()
   → Check for semantic HTML (header, nav, main, footer)
3. query_selector({
     selector: "[role]",
     showAttributes: "role,aria-label,aria-labelledby"
   })
   → Shows all ARIA roles on page
4. find_by_text({ text: "button", regex: true })
   → Find buttons by text (should have accessible labels)
5. query_selector({
     selector: "button",
     showAttributes: "aria-label,title"
   })
   → Check if buttons have accessible labels
6. get_test_ids()
   → Verify no duplicate test IDs (accessibility issue)
```

**Why this works**: DOM inspection + attribute queries reveal accessibility issues.

## Troubleshooting

### Browser Installation Issues

**Symptom**: Error message about Playwright browsers not being installed, or browser fails to launch.

**How it works**: Browsers are **automatically installed on first use** when you run any navigation tool. The installation happens once (~1GB download) and browsers are stored in your home directory, shared across all projects.

**What you'll see on first use**:
```
🎭 Playwright browsers not found. Installing automatically...
⏳ This will download ~1GB of browser binaries. Please wait...
[Installation progress...]
✅ Browsers installed successfully! Starting browser...
```

**If automatic installation fails** (firewall, permissions, etc.):

```bash
# Manual installation - run this command:
npx playwright install chromium firefox webkit

# With system dependencies (requires admin/sudo):
npx playwright install --with-deps chromium firefox webkit
```

**For GitHub Copilot / VS Code users**:
- First tool use will auto-install browsers (1-2 minute wait)
- Subsequent uses are instant
- Installation happens in the background with progress messages
- If manual installation is needed, restart your IDE after running the command

### Server Not Loading

**Symptom**: Tools from web-inspector are not available in your AI assistant.

**Solutions**:
1. Verify the configuration file is correct (see AI Tool Setup section above)
2. Restart your AI tool completely (not just reload window)
3. Check server logs (location depends on your AI tool)
4. Try removing and re-adding the server configuration

### Permission Issues

**Symptom**: Permission denied errors when installing browsers.

**Solutions**:
```bash
# If using global installation, you may need sudo (Linux/macOS)
sudo npm install -g mcp-web-inspector

# Or use npx without global installation (recommended)
# Just configure with "npx -y mcp-web-inspector" as shown in setup
```

### Browser Crashes or Disconnects

**Symptom**: Browser becomes unresponsive or disconnects during use.

**The MCP server automatically handles this**:
- Detects disconnected browsers
- Resets state and provides clear error messages
- Instructs you to retry the navigation/action
- No manual intervention needed - just retry your command

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
