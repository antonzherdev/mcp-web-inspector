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
- **`--expose-sensitive-network-data`** - Loosen redaction for sensitive network headers (e.g., show truncated auth/cookie values). Disabled by default for safety.

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
      "args": ["-y", "mcp-web-inspector", "--headless", "--no-save-session", "--user-data-dir", "./.mcp-web-inspector"]
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
### Inspection

#### `inspect_dom`
🔍 PRIMARY INSPECTION TOOL - START HERE FOR LAYOUT DEBUGGING: Progressive DOM inspection that shows parent-child relationships, centering issues, spacing gaps, and scrollable containers. Skips wrapper divs and shows only semantic elements (header, nav, main, form, button, elements with test IDs, ARIA roles, etc.).

WORKFLOW: Call without selector for page overview, then drill down by calling with child's selector.

DETECTS: Scrollable containers (shows "scrollable ↕️ 36px" when scrollHeight > clientHeight), parent-relative positioning, vertical/horizontal centering, sibling spacing gaps, layout patterns.

OUTPUT FORMAT:
```
[0] <button data-testid="menu">
    @ (16,8) 40×40px                         ← Absolute viewport position (x,y) and size
    from edges: ←16px →1144px ↑8px ↓8px      ← Distance from parent edges (↑8px = ↓8px means vertically centered)
    "Menu"
    ✓ visible, ⚡ interactive

[1] <div data-testid="title">
    @ (260,2) 131×28px
    from edges: ←244px →244px ↑2px ↓42px     ← Equal left/right (244px) = horizontally centered, unequal top/bottom = NOT vertically centered
    gap from [0]: →16px                      ← Spacing between siblings
    "Title"
    ✓ visible, 2 children
```

SYMBOLS: ✓=visible, ✗=hidden, ⚡=interactive, ←→=horizontal edges, ↑↓=vertical edges, ↕️=vertical scroll, ↔️=horizontal scroll
CENTERING: Equal left/right distances = horizontally centered, equal top/bottom = vertically centered
SCROLL DETECTION: Automatically detects scrollable containers and shows overflow amount (e.g., "scrollable ↕️ 397px" means 397px of hidden content). No need to use evaluate() to compare scrollHeight/clientHeight.

RELATED TOOLS: For comparing TWO elements' alignment (not parent-child), use compare_element_alignment(). For box model (padding/margin), use measure_element().

⚠️ More efficient than get_html() or evaluate() for structural analysis. Use BEFORE visual tools (screenshot) or evaluate(). Supports testid shortcuts.

NOTE: Dropdowns, listboxes, dialogs, and popovers (especially in react-aria/headless UI/Radix) are commonly portaled to document.body — when a combobox or menu is open, query at the root level (e.g. `[role="listbox"]`, `[role="dialog"]`) rather than inside the trigger's subtree.

- Parameters:
  - selector (string, optional): CSS selector, text selector, or testid shorthand to inspect. Omit for page overview (defaults to body). Use 'testid:login-form', '#main', etc.
  - includeHidden (boolean, optional): Include hidden elements in results (default: false)
  - maxChildren (number, optional): Maximum number of children to show (default: 20)
  - maxDepth (number, optional): Maximum depth to drill through non-semantic wrapper elements when looking for semantic children (default: 5). Increase for extremely deeply nested components, decrease to 1 to see only immediate children without drilling.

- Output Format:
  - Optional selection header when multiple matches (with chosen index).
  - For each listed element:
    - Indexed tag with best identifier (testid/ID/classes).
    - Position line: @ (x,y) width×height px.
    - from edges: left/right/top/bottom distances; centering hints.
    - gap from [prev]: spacing between siblings when applicable.
    - Text snippet in quotes (trimmed).
    - Status: ✓ visible / ✗ hidden, ⚡ interactive, N children.
    - Scrollable markers ↕️/↔️ with overflow amount when detected.

- Examples:
- inspect_dom({})
- inspect_dom({ selector: 'testid:menu' })
- inspect_dom({ selector: '#content', maxChildren: 10 })

- Example Output (inspect_dom({})):
```
[0] <header data-testid="site-header">
    @ (0,0) 1280×64px
    from edges: ←0px →0px ↑0px ↓1216px
    "My App"
    ✓ visible, 3 children

[1] <main id="content">
    @ (0,64) 1280×640px
    from edges: ←0px →0px ↑64px ↓512px
    "Welcome back"
    ✓ visible, 5 children, scrollable ↕️ 320px
```
- Example Output (inspect_dom({ selector: 'testid:menu' })):
```
[0] <button data-testid="menu">
    @ (16,8) 40×40px
    from edges: ←16px →1224px ↑8px ↓16px
    "Menu"
    ✓ visible, ⚡ interactive
```

#### `inspect_ancestors`
DEBUG LAYOUT CONSTRAINTS: Walk up the DOM tree to find where width constraints, margins, borders, and overflow clipping come from. Shows for each ancestor: position/size, width constraints (w, max-w, min-w), margins with directional arrows (↑↓←→ format), padding, display type, borders (directional if non-uniform), overflow (🔒=hidden, ↕️=scroll), flexbox context (flex direction justify items gap), grid context (cols rows gap), position/z-index/transform when set. Automatically detects horizontal centering via auto margins and flags clipping points (🎯). Essential for debugging unexpected centering, constrained width, or clipped content. Default: 10 ancestors (reaches <body> in most React apps), max: 15. Use after inspect_dom() to understand parent layout constraints.

- Parameters:
  - selector (string, required): CSS selector or testid shorthand for the element to start from (e.g., 'testid:header', '#main')
  - limit (number, optional): Maximum number of ancestors to traverse (default: 10, max: 15). Increase for deeply nested component frameworks.

- Output Format:
  - Header showing selected element index when selector matched multiple.
  - For each ancestor (starting from target):
    - [i] <tag> | testid:... or classes
    - @ (x,y) width×height px
    - Inline summary: w, display (if not block), m/p, max-w, min-w
    - Flexbox/Grid context when present (direction, gap, grid templates)
    - Margin breakdown with arrows (↑↓←→) and centering diagnostics
    - Border details when set (directional if non-uniform)
    - Overflow state: 🔒 hidden, ↕️/↔️ scroll + overflow amount
    - Extra: position/z-index/transform when non-default
    - Diagnostics: 🎯 CLIPPING POINT / SCROLLABLE CONTAINER / WIDTH CONSTRAINT

- Examples:
- inspect_ancestors({ selector: 'testid:submit-button' })
- inspect_ancestors({ selector: '#content', limit: 15 })

- Example Output (inspect_ancestors({ selector: 'testid:submit-button' })):
```
Selected: testid:submit-button (1 of 2 matches)

Ancestor Chain:

[0] <button> | testid:submit-button
    @ (860,540) 120x40px | w:120px display:inline-block
    margin: ↑0px →0px ↓0px ←0px
    border: 1px solid rgb(0, 122, 255)
    ⚠ none

[1] <div> | form-actions
    @ (800,520) 240x80px | w:240px display:flex m:0px p:16px gap:8px
    flex: row, justify:center, align:center, gap:8px
    margin: →auto ←auto ← Horizontally centered (likely margin:0 auto)
    border: none
    overflow: 🔒 hidden
    🎯 CLIPPING POINT - May clip overflowing children

[2] <form> | #login-form
    @ (640,200) 560x480px | w:560px max-w:600px
    position:relative
    🎯 WIDTH CONSTRAINT
```

#### `compare_element_alignment`
COMPARE TWO ELEMENTS: Get comprehensive alignment and dimension comparison in one call. Shows edge alignment (top, left, right, bottom), center alignment (horizontal, vertical), and dimensions (width, height). Perfect for debugging 'are these headers aligned?' or 'do these panels match?'. Returns all alignment info with ✓/✗ symbols and pixel differences. For parent-child centering, use inspect_dom() instead (automatically shows if children are centered in parent). More efficient than evaluate() with manual getBoundingClientRect() calculations.

- Parameters:
  - selector1 (string, required): CSS selector, text selector, or testid shorthand for the first element (e.g., 'testid:main-header', '#header')
  - selector2 (string, required): CSS selector, text selector, or testid shorthand for the second element (e.g., 'testid:chat-header', '#secondary-header')

- Output Format:
  - Optional warnings when a selector matched multiple elements (uses first visible; suggests adding unique data-testid).
  - Header: Alignment: <elem1> vs <elem2>
  - Two lines with each element's position and size: @ (x,y) w×h px
  - Edges block: Top/Left/Right/Bottom with ✓/✗ and diffs
  - Centers block: Horizontal/Vertical center alignment with ✓/✗ and diffs
  - Dimensions block: Width/Height same or different with ✓/✗ and diffs
  - Optional hint to run inspect_ancestors(...) when large misalignment detected

- Examples:
- compare_element_alignment({ selector1: 'testid:header-title', selector2: 'testid:subtitle' })
- compare_element_alignment({ selector1: '#left-panel', selector2: '#right-panel' })

- Example Output (compare_element_alignment({ selector1: '#left-panel', selector2: '#right-panel' })):
```
Alignment: <div #left-panel> vs <div #right-panel>
  #left-panel: @ (80,120) 320×600px
  #right-panel: @ (440,120) 320×600px

Edges:
  Top:    ✓ aligned (both @ 120px)
  Left:   ✗ not aligned (80px vs 440px, diff: 360px)
  Right:  ✗ not aligned (400px vs 760px, diff: 360px)
  Bottom: ✓ aligned (both @ 720px)

Centers:
  Horizontal: ✗ not aligned (240px vs 600px, diff: 360px)
  Vertical:   ✓ aligned (both @ 420px)

Dimensions:
  Width:  ✓ same (320px)
  Height: ✓ same (600px)
```

#### `get_computed_styles`
INSPECT CSS PROPERTIES: Get computed CSS values for specific properties (display, position, width, etc.). Use when you need raw CSS values or specific properties not shown by measure_element(). Returns styles grouped by category (Layout, Visibility, Spacing, Typography). For box model visualization (padding/margin), use measure_element() instead.

- Parameters:
  - selector (string, required): CSS selector, text selector, or testid shorthand (e.g., 'testid:submit-button', '#main')
  - properties (string, optional): Comma-separated list of CSS properties to retrieve (e.g., 'display,width,color'). If not specified, returns common layout properties: display, position, width, height, opacity, visibility, z-index, overflow, margin, padding, font-size, font-weight, color, background-color

- Output Format:
  - Optional selection header when multiple elements matched.
  - Header: 'Computed Styles: <tag id/class/testid>'
  - One or more sections: Layout, Visibility, Spacing, Typography, Other
  - Each section lists 'property: value' lines for requested properties

- Examples:
- get_computed_styles({ selector: 'testid:login-form' })
- get_computed_styles({ selector: '#hero', properties: 'display,width,color' })

- Example Output (get_computed_styles({ selector: 'testid:login-form' })):
```
⚠ Found 2 elements matching "testid:login-form", using element 1 (first visible)
💡 Tip: Consider adding a unique data-testid attribute for more reliable selection.
   Primary fix: add data-testid and target it (e.g., testid:submit).
   Workaround: use '>> nth=<index>' only when you can't add test IDs.

Computed Styles: <form data-testid="login-form">

Layout:
  display: block
  position: static
  width: 560px
  height: 480px

Visibility:
  opacity: 1
  visibility: visible
  z-index: auto
  overflow: visible

Spacing:
  margin: 0px
  padding: 24px

Typography:
  font-size: 16px
  font-weight: 400
  color: rgb(33, 37, 41)
```

#### `check_visibility`
Check if an element is visible to the user. CRITICAL for debugging click/interaction failures. Returns detailed visibility information including viewport intersection, clipping by overflow:hidden, and whether element needs scrolling. Supports testid shortcuts (e.g., 'testid:submit-button').

- Parameters:
  - selector (string, required): CSS selector, text selector, or testid shorthand (e.g., 'testid:login-button', '#submit', 'text=Click here')

- Output Format:
  - Header: Visibility: <tag id/class/testid>
  - Status line: ✓ visible/✗ hidden, ✓/✗ in viewport with % visible
  - CSS: opacity, display, visibility
  - Optional interactability issues: disabled, readonly, aria-disabled, pointer-events:none
  - Optional Issues block: clipped by parent overflow, covered by element (with descriptor and ~coverage%), needs scroll
  - Optional Suggestions: scroll_to_element, modal/overlay hint, interaction state note
  - Optional tip to run inspect_ancestors when clipping is detected

- Examples:
- check_visibility({ selector: 'testid:submit' })
- check_visibility({ selector: '#login button' })

- Example Output (check_visibility({ selector: 'testid:submit' })):
```
Visibility: <button data-testid="submit">

✓ visible, ✓ in viewport
opacity: 1, display: inline-block, visibility: visible
```
- Example Output (check_visibility({ selector: '#hero-cta' })):
```
Visibility: <a #hero-cta>

✗ hidden, ✗ not in viewport (45% visible)
opacity: 1, display: block, visibility: visible

Issues:
  ✗ covered by another element (~60% covered)
    Covering: <div .modal-backdrop> (z-index: 9999)
  ⚠ needs scroll to bring into view

→ Call scroll_to_element before clicking
→ Element may be behind modal, overlay, or fixed header
```

#### `query_selector`
Test a selector and return detailed information about all matched elements. Essential for selector debugging and finding the right element to interact with. Returns compact text format with element tag, position, text content, visibility status, and interaction capability. Shows why elements are hidden (display:none, opacity:0, zero size). Supports testid shortcuts (e.g., 'testid:submit-button'). Use limit parameter to control how many matches to show (default: 10). NEW: Use onlyVisible parameter to filter results (true=visible only, false=hidden only, undefined=all).

- Parameters:
  - selector (string, required): CSS selector, text selector, or testid shorthand to test (e.g., 'button.submit', 'testid:login-form', 'text=Sign In')
  - limit (number, optional): Maximum number of elements to return detailed info for (default: 10, recommended max: 50)
  - onlyVisible (boolean, optional): Filter results by visibility: true = show only visible elements, false = show only hidden elements, undefined/not specified = show all elements (default: undefined)
  - showAttributes (string, optional): Comma-separated list of HTML attributes to display for each element (e.g., 'id,name,aria-label,href,type'). If not specified, attributes are not shown.

- Output Format:
  - Header showing total matches (and filtered visible/hidden counts if requested).
  - For each match (up to limit):
    - Index with element tag and identifier (testid/id/class).
    - Position line: @ (x,y) widthxheight px.
    - Optional trimmed text content in quotes.
    - Optional listed attributes if requested.
    - Status line: ✓ visible or ✗ hidden with reason (display:none, opacity:0, zero size); ⚡ interactive when applicable.
  - Footer with how many are shown vs omitted and a tip to increase limit.

- Examples:
- query_selector({ selector: 'a', limit: 3 })
- query_selector({ selector: 'testid:submit', onlyVisible: true, showAttributes: 'href,aria-label' })

- Example Output (query_selector({ selector: 'a', limit: 2 })):
```
Found 5 elements matching "a":

[0] <a #home-link>
    @ (16,12) 80x20px
    "Home"
    href: "/"
    ✓ visible, ⚡ interactive

[1] <a class="nav-item">
    @ (104,12) 120x20px
    "Products"
    ✓ visible, ⚡ interactive

Showing 2 of 5 matches (3 omitted)
Use limit parameter to show more: { selector: "a", limit: 5 }
```

#### `get_test_ids`
Discover all test identifiers on the page (data-testid, data-test, data-cy, etc.). Returns a compact text list grouped by attribute type. Essential for test-driven workflows and understanding what elements can be reliably selected. Use the returned test IDs with selector shortcuts like 'testid:submit-button'.

- Parameters:
  - attributes (string, optional): Comma-separated list of test ID attributes to search for (default: 'data-testid,data-test,data-cy')
  - showAll (boolean, optional): If true, display all test IDs without truncation. If false (default), shows first 8 test IDs per attribute with a summary for longer lists.

- Output Format:
  - 'Found N test IDs' header or 'Found 0 test IDs' with tips
  - For each attribute group: attribute name with count and a compact comma-separated list (or truncated with '... and X more')
  - Optional duplicate warnings: attribute:value appears N times
  - Suggestion block with best practices and usage tip for selector shortcuts

- Examples:
- get_test_ids({})
- get_test_ids({ showAll: true })
- get_test_ids({ attributes: 'data-testid,data-cy' })

- Example Output (get_test_ids({})):
```
Found 5 test IDs:

data-testid (3):
  submit, email-input, password-input

data-cy (2):
  navbar, footer

💡 Tip: Use these test IDs with selector shortcuts:
   testid:submit → [data-testid="submit"]
```
- Example Output (get_test_ids({ showAll: false })):
```
Found 14 test IDs:

data-testid (12):
  submit, email-input, password-input, remember-me, login-form, link-register, link-forgot, header-title,
  ... and 4 more
  💡 Use showAll: true to see all 12 test IDs

data-cy (2):
  navbar, footer
```

#### `measure_element`
📏 MEASUREMENT TOOL - DEBUG SPACING ISSUES: See padding, margin, border, and dimension measurements in visual box model format. Use when elements have unexpected spacing or size. Returns compact visual representation showing content → padding → border → margin with directional arrows (↑24px for top margin, etc.). Also provides raw dimensions useful for scroll detection (clientHeight vs content height). For parent-child centering issues, use inspect_dom() first (shows if child is centered in parent). For comparing alignment between two elements, use compare_element_alignment(). For quick scroll detection, use inspect_dom() instead (shows 'scrollable ↕️'). More readable than get_computed_styles() or evaluate() for box model debugging.

- Parameters:
  - selector (string, required): CSS selector or testid shorthand (e.g., 'testid:submit', '#login-button')

- Output Format:
  - Header: Element: <tag id/class/testid>
  - Position/size line: @ (x,y) widthxheight px
  - Box Model section: Content size, Padding (with directional arrows), Border (with arrows or shorthand), Margin (with arrows)
  - Total Space line: totalWidthxtotalHeight px (with margin)
  - Optional suggestion to run inspect_ancestors when unusual spacing detected

- Examples:
- measure_element({ selector: 'testid:card' })
- measure_element({ selector: '#hero' })

- Example Output (measure_element({ selector: 'testid:card' })):
```
Element: <div data-testid="card">
@ (240,320) 360x240px

Box Model:
  Content: 328x208px
  Padding: ↑16px ↓16px ←8px →8px
  Border:  none
  Margin:  ↑0px ↓24px ←0px →0px

Total Space: 360x264px (with margin)
```

#### `find_by_text`
Find elements by their text content. Essential for finding elements without good selectors, especially in poorly structured DOM. Returns elements with position, visibility, and interaction state. Supports exact match, case-sensitive search, and NEW: regex pattern matching for advanced text searching (e.g., '/\d+ items?/' to find elements with numbers).

- Parameters:
  - text (string, required): Text to search for in elements. If regex=true, this can be a regex pattern in /pattern/flags format (e.g., '/\d+/i' for case-insensitive numbers) or a raw pattern string.
  - exact (boolean, optional): Whether to match text exactly (default: false, allows partial matches). Ignored if regex=true.
  - caseSensitive (boolean, optional): Whether search should be case-sensitive (default: false). Ignored if regex=true (use regex flags instead).
  - regex (boolean, optional): Whether to treat 'text' as a regex pattern (default: false). If true, supports /pattern/flags format or raw pattern. Examples: '/sign.*/i' (case-insensitive), '/\d+ items?/' (numbers + optional 's').
  - limit (number, optional): Maximum number of elements to return (default: 10)

- Output Format:
  - Header showing 'No elements found ...' or 'Found N elements ...'
  - Up to limit results, each with:
    - <tag id/class/testid ...> line with key attributes
    - Position line: @ (x,y) widthxheight px
    - Trimmed text content (if any)
    - Visibility and interactability status
  - Footer shows how many are displayed vs omitted and how to increase limit

- Examples:
- find_by_text({ text: 'Sign in' })
- find_by_text({ text: '/^Next \d+$/', regex: true })
- find_by_text({ text: 'Delete', exact: true, caseSensitive: true })

- Example Output (find_by_text({ text: 'Sign in' })):
```
Found 3 elements containing "Sign in":

[0] <button data-testid="primary-cta">
    @ (640,420) 120x40px
    "Sign in"
    ✓ visible

[1] <a class="link" href="/signin">
    @ (600,480) 68x20px
    "Sign in"
    ✓ visible, ⚡ interactive

[2] <div class="menu-item">
    @ (40,360) 200x24px
    "Sign in"
    ✗ hidden

Showing all 3 matches
```

#### `element_exists`
Quick check if an element exists on the page. Ultra-lightweight alternative to query_selector_all when you only need existence confirmation. Returns simple exists/not found status. Most common check before attempting interaction. Supports testid shortcuts.

- Parameters:
  - selector (string, required): CSS selector, text selector, or testid shorthand (e.g., 'testid:submit-button', '#main')

- Output Format:
  - Returns one line:
    - ✓ exists: <tag id/class> (N matches) when found (N optional)
    - ✗ not found: <original selector> when none

- Examples:
- element_exists({ selector: 'testid:submit' })
- element_exists({ selector: '#does-not-exist' })

- Example Output (element_exists({ selector: 'testid:submit' })):
```
✓ exists: <button data-testid="submit">
```
- Example Output (element_exists({ selector: '.card' })):
```
✓ exists: <div .card> (3 matches)
```
- Example Output (element_exists({ selector: '#does-not-exist' })):
```
✗ not found: #does-not-exist
```

### Navigation

#### `go_history`
Navigate browser history (back/forward). Returns: 'Navigated <direction> in browser history', a quick network-idle note if available, 'URL: <current>', and 'Title: <current>' when set. If console errors occur after the navigation, returns an error like 'Console error after history navigation: <message>' including Title when available.

- Parameters:
  - direction (string, required): History direction to navigate

#### `navigate`
Navigate to a URL. Browser sessions (cookies, localStorage, sessionStorage) are automatically saved in ./.mcp-web-inspector/user-data directory and persist across restarts. To clear saved sessions, delete the directory.

- Parameters:
  - url (string, required): URL to navigate to the website specified
  - browserType (string, optional): Browser type to use (chromium, firefox, webkit). Defaults to chromium
  - device (string, optional): Device preset to emulate. Uses device configurations for viewport, user agent, and device scale factor. When specified, overrides width/height parameters. Mobile: iphone-se, iphone-14, iphone-14-pro, pixel-5, ipad, samsung-s21. Desktop: desktop-1080p (1920x1080), desktop-2k (2560x1440), laptop-hd (1366x768).
  - width (number, optional): Viewport width in pixels. If not specified, automatically matches screen width. Ignored if device is specified.
  - height (number, optional): Viewport height in pixels. If not specified, automatically matches screen height. Ignored if device is specified.
  - timeout (number, optional): Navigation timeout in milliseconds
  - waitUntil (string, optional): Navigation wait condition
  - headless (boolean, optional): Run browser in headless mode (default: true - no window shown)

#### `scroll_by`
Scroll a container (or page) by a specific number of pixels. Auto-detects scroll direction when only one is available. Essential for: testing sticky headers/footers, triggering infinite scroll, carousel navigation, precise scroll position testing. Use 'html' or 'body' for page scrolling. Positive pixels = down/right, negative = up/left. Outputs: ✓ success summary with axis position and percent of max scroll; ⚠️ boundary notice when movement is limited; ⚠️ ambiguous-direction guidance when both axes scroll; ⚠️ not-scrollable report with ancestor suggestions; 💡 follow-up tips matching the detected scenario.

- Parameters:
  - selector (string, required): CSS selector of scrollable container (use 'html' or 'body' for page scroll, e.g., 'testid:chat-container', '.scrollable-list', 'html')
  - pixels (number, required): Number of pixels to scroll. Positive = down/right, negative = up/left. Example: 500, -200
  - direction (string, optional): Scroll direction: 'vertical' (default), 'horizontal', or 'auto' (detects available direction). Use 'auto' for smart detection.

#### `scroll_to_element`
Scroll an element into view. Automatically handles scrolling within the nearest scrollable ancestor (page or scrollable container). Essential for: making elements visible before interaction, triggering lazy-loaded content, testing scroll behavior. Position: start (top of viewport), center (middle), end (bottom). Default: start.

- Parameters:
  - selector (string, required): CSS selector, text selector, or test ID (e.g., 'testid:submit-btn', '#login-button', 'text=Load More')
  - position (string, optional): Where to align element in viewport: 'start' (top), 'center' (middle), 'end' (bottom). Default: 'start'

### Interaction

#### `click`
Click an element on the page

- Parameters:
  - selector (string, required): CSS selector for the element to click

#### `drag`
Drag an element to a target location

- Parameters:
  - sourceSelector (string, required): CSS selector for the element to drag
  - targetSelector (string, required): CSS selector for the target location

#### `fill`
fill out an input field

- Parameters:
  - selector (string, required): CSS selector for input field
  - value (string, required): Value to fill

#### `hover`
Hover an element on the page

- Parameters:
  - selector (string, required): CSS selector for element to hover

#### `press_key`
Press a keyboard key

- Parameters:
  - key (string, required): Key to press (e.g. 'Enter', 'ArrowDown', 'a')
  - selector (string, optional): Optional CSS selector to focus before pressing key

#### `select`
Select an element on the page with Select tag

- Parameters:
  - selector (string, required): CSS selector for element to select
  - value (string, required): Value to select

#### `upload_file`
Upload a file to an input[type='file'] element on the page

- Parameters:
  - selector (string, required): CSS selector for the file input element
  - filePath (string, required): Absolute path to the file to upload

### Content

#### `get_html`
[may return preview+token] ⚠️ RARELY NEEDED: Get raw HTML markup from the page (no rendering, just source code). Most tasks need structured inspection instead. ONLY use get_html for: (1) checking specific HTML attributes or element nesting, (2) analyzing markup structure, (3) debugging SSR/HTML issues. For structured tasks, use: inspect_dom() to understand page structure with positions, query_selector() to find and inspect elements, get_computed_styles() for CSS values. Auto-returns HTML if <2000 chars (small elements); if larger, returns a preview and a one-time token to fetch the full output. Scripts removed by default for security/size. Supports testid shortcuts.

- Parameters:
  - selector (string, optional): CSS selector, text selector, or testid shorthand to limit HTML extraction to a specific container. Omit to get entire page HTML. Example: 'testid:main-content' or '#app'
  - clean (boolean, optional): Remove noise from HTML: false (default) = remove scripts only, true = remove scripts + styles + comments + meta tags for minimal markup
  - maxLength (number, optional): Maximum number of characters to return (default: 20000)

#### `get_text`
[may return preview+token] ⚠️ RARELY NEEDED: Get ALL visible text content from the entire page (no structure, just raw text). Most tasks need structured inspection instead. ONLY use get_text for: (1) extracting text for content analysis (word count, language detection), (2) searching for text when location is completely unknown, (3) text-only snapshots for comparison. For structured tasks, use: inspect_dom() to understand page structure, find_by_text() to locate specific text with context, query_selector() to find elements. Auto-returns text if <2000 chars (small elements); if larger, returns a preview and a one-time token to fetch the full output via confirm_output. Supports testid shortcuts.

- Parameters:
  - selector (string, optional): CSS selector, text selector, or testid shorthand to limit text extraction to a specific container. Omit to get text from entire page. Example: 'testid:article-body' or '#main-content'
  - maxLength (number, optional): Maximum number of characters to return (default: 20000)

#### `visual_screenshot_for_humans`
[may return preview+token] 📸 VISUAL OUTPUT TOOL - Captures page/element appearance and saves to file. Essential for: visual regression testing, sharing with humans, confirming UI appearance (colors/fonts/images).

❌ WRONG: "Take screenshot to debug button alignment"
✅ RIGHT: "Use compare_element_alignment() - alignment in <100 tokens"

❌ WRONG: "Screenshot to check element visibility"
✅ RIGHT: "Use check_visibility() - instant visibility + diagnostics"

❌ WRONG: "Screenshot to inspect layout structure"
✅ RIGHT: "Use inspect_dom() - hierarchy with positions and visibility"

✅ VALID: "Share with designer for feedback"
✅ VALID: "Visual regression check"
✅ VALID: "Confirm gradient/shadow rendering"

⚠️ Token cost: ~1,500 tokens to read. Structural tools: <100 tokens.

Screenshots saved to ./.mcp-web-inspector/screenshots. Example: { name: "login-page", fullPage: true } or { name: "submit-btn", selector: "testid:submit" }

- Parameters:
  - name (string, required): Name for the screenshot file (without extension). Example: 'login-page' or 'error-state'
  - selector (string, optional): CSS selector or testid shorthand for element to screenshot. Example: '#submit-button' or 'testid:login-form'. Omit to capture full viewport.
  - fullPage (boolean, optional): Capture entire scrollable page instead of just viewport (default: false)
  - downloadsDir (string, optional): Custom directory for saving screenshot (default: ./.mcp-web-inspector/screenshots). Example: './my-screenshots'

### Console

#### `clear_console_logs`
Clears captured console logs and returns the number of entries cleared.

#### `get_console_logs`
[may return preview+token] Retrieve console logs with filtering and token‑efficient output. Defaults: since='last-interaction', limit=20, format='grouped'. Grouped output deduplicates identical lines and shows counts. Use format='raw' for chronological, ungrouped lines. Large outputs return a preview and a one-time token to fetch the full payload.

- Parameters:
  - type (string, optional): Type filter (all, error, warning, log, info, debug, exception). Note: 'error' also includes 'exception' entries for convenience.
  - search (string, optional): Text to search for in logs (handles text with square brackets)
  - limit (number, optional): Maximum entries to return (groups when grouped, lines when raw). Default: 20
  - since (string, optional): Filter logs since a specific event: 'last-call' (since last get_console_logs call), 'last-navigation' (since last page navigation), or 'last-interaction' (since last user interaction like click, fill, etc.). Default: 'last-interaction'
  - format (string, optional): Output format: 'grouped' (default, deduped with counts) or 'raw' (chronological, ungrouped)

### Evaluation

#### `evaluate`
[may return preview+token] ⚙️ CUSTOM JAVASCRIPT EXECUTION - Execute arbitrary JavaScript in the browser console and return a compact, token-efficient summary of the result. Single expressions return their value automatically; multi-statement scripts must use `return`. Includes a large-output preview guard with a one-time token. ⚠️ NOT for: scroll detection (inspect_dom shows 'scrollable ↕️'), element dimensions (use measure_element), DOM inspection (use inspect_dom), CSS properties (use get_computed_styles), position comparison (use compare_element_alignment). Use ONLY when specialized tools cannot accomplish the task. Automatically detects common patterns and suggests better alternatives.

- Parameters:
  - script (string, required): JavaScript code to execute

- Output Format:
  - Header: '✓ JavaScript execution result:'
  - Default result: compact summary string (arrays/objects/dom nodes summarized)
  - Array summary: 'Array(n) [first, second, third…]' (shows first 3 items)
  - Object summary (large): 'Object(n keys): key1, key2, key3…' (top-level keys only)
  - DOM node summary: '<tag id=#id class=.a.b> @ (x,y) WxH' (rounded ints)
  - NodeList/HTMLCollection summary: 'NodeList(n) [<div…>, <span…>, <a…>…]'
  - Preview guard when result is large (≥ ~2000 chars):
    - 'Preview (first 500 chars):' followed by excerpt
    - Counts: 'totalLength: N, shownLength: M, truncated: true'
    - One-time token string to fetch full output
  - Suggestions block (conditional): compact tips for specialized tools based on script patterns

### Network

#### `get_request_details`
[may return preview+token] Get detailed information about a specific network request by index (from list_network_requests). Returns request/response headers, body (truncated at 500 chars), timing, and size. Request bodies with passwords are automatically masked. If a request or response body exceeds 500 chars, includes a preview and a one-time confirm_output token that, when called, saves the full body to disk under ./.mcp-web-inspector/network-bodies/ and returns the file path(s). Essential for debugging API responses and investigating failed requests.

- Parameters:
  - index (number, required): Index of the request from list_network_requests output (e.g., [0], [1], etc.)

#### `list_network_requests`
List recent network requests captured by the browser. Returns compact text format with method, URL, status, resource type, timing, and size. Essential for debugging API calls and performance issues. Use get_request_details() to inspect full headers and body for specific requests.

- Parameters:
  - type (string, optional): Filter by resource type: 'xhr', 'fetch', 'script', 'stylesheet', 'image', 'font', 'document', etc. Omit to show all types.
  - limit (number, optional): Maximum number of requests to return, most recent first (default: 50)

### Waiting

#### `wait_for_element`
Wait for an element to reach a specific state (visible, hidden, attached, detached). Better than sleep() for waiting on dynamic content. Returns duration and current element status. Supports testid shortcuts (e.g., 'testid:submit-button').

- Parameters:
  - selector (string, required): CSS selector, text selector, or testid shorthand (e.g., 'testid:submit-button', '#loading-spinner')
  - state (string, optional): State to wait for: 'visible' (default), 'hidden', 'attached', 'detached'
  - timeout (number, optional): Maximum time to wait in milliseconds (default: 10000)

#### `wait_for_network_idle`
Wait for network activity to settle. Waits until there are no network connections for at least 500ms. Better than fixed delays when waiting for AJAX calls or dynamic content loading. Returns actual wait duration and confirmation of idle state.

- Parameters:
  - timeout (number, optional): Maximum time to wait in milliseconds (default: 10000)

### Lifecycle

#### `close`
Close the browser and release all resources

#### `set_color_scheme`
Set the browser color scheme that controls CSS prefers-color-scheme. Defaults to system appearance. Use before inspecting colors or taking screenshots. Options: system (clear override to follow OS/browser setting), dark, light, no-preference (simulate agents with no declared preference). Returns confirmation of the active scheme.

- Parameters:
  - scheme (string, required): Color scheme to emulate: 'system', 'dark', 'light', or 'no-preference'. Example: { scheme: 'dark' }

### Other

#### `confirm_output`
Return full output for a previously previewed large result using a one-time token. Use when a tool responded with a preview + token. Safer than resending original parameters.

- Parameters:
  - token (string, required): One-time token obtained from a tool's preview response
  - reason (string, required): Explain why the full output is needed and how it will be used. This helps the user understand whether the action is reasonable and necessary.

- Output Format:
  - Full original payload if token is valid (one-time)
  - Error: 'Invalid or expired token'
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
2. fill({ selector: "testid:email-input", value: "user@example.com" })
3. fill({ selector: "testid:password-input", value: "password123" })
4. click({ selector: "testid:login-button" })
5. wait_for_network_idle()
6. get_console_logs({ type: "error" })
   → Verify no JavaScript errors occurred
7. get_text()
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
```
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
2. compare_positions({
     selector1: "testid:header",
     selector2: "testid:footer",
     checkAlignment: "width"
   })
   → ✓ aligned (both 1280px)
3. compare_positions({
     selector1: ".card:nth-child(1)",
     selector2: ".card:nth-child(2)",
     checkAlignment: "height"
   })
   → ✗ not aligned (difference: 20px)
4. measure_element({ selector: ".card:nth-child(1)" })
   → @ (20,100) 400x300px
5. measure_element({ selector: ".card:nth-child(2)" })
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
8. get_text({ selector: ".error-message" })
   → Capture validation text for assertions
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
2. inspect_dom({ selector: "nav" })
   → Check if mobile menu is used
4. element_exists({ selector: "testid:hamburger-menu" })
   → ✓ exists (mobile menu visible)
5. element_exists({ selector: "testid:desktop-menu" })
   → ✗ not found (desktop menu hidden on mobile)
6. click({ selector: "testid:hamburger-menu" })
7. wait_for_element({ selector: "testid:mobile-nav", state: "visible" })
8. get_text({ selector: "testid:mobile-nav" })
   → Snapshot of opened mobile menu content
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
7. check_visibility({ selector: "testid:tooltip" })
   → Double-check that tooltip remains visible
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
