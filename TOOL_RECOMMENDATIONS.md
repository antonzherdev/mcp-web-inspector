# Playwright MCP Server - Tool Recommendations (Revised & Consolidated)

**IMPORTANT:** This document has been revised based on LLM tool calling best practices research (2024-2025) and production testing assessment (2025-10-19). See `TOOL_DESIGN_PRINCIPLES.md` for detailed design rationale.

**Document Structure:**
1. **Implementation Status** - What's completed with recent enhancements
2. **Recommended Tools for Implementation** - 17 deduplicated tools in priority order (🔴 High / 🟡 Medium / 🟢 Low)
3. **Reference Sections** - Detailed specs for implemented tools (inspect_dom, get_test_ids, etc.)
4. **Implementation Summary** - Quick overview of completed and remaining work

**Key Changes (2025-10-19):**
- Merged assessment findings with original recommendations
- Removed duplicate/similar tools (`get_element_attributes` → use `query_selector_all` with `showAttributes`)
- Added 5 new high-value tools from production testing
- All recommendations follow strict token-efficiency and design principles

## 🎉 Implementation Status

**Completed:** 9 tools + selector normalization helper
**Total Remaining:** 10 tools

### ✅ Recently Implemented
- `playwright_inspect_dom` - **PRIMARY TOOL** - Progressive DOM inspection with semantic filtering ✅
- `playwright_get_test_ids` - Discover all test identifiers on the page (with `showAll` parameter) ✅ **ENHANCED**
- `playwright_query_selector_all` - Test selectors and debug element matches (with `showAttributes` parameter) ✅ **ENHANCED**
- `playwright_element_visibility` - Comprehensive visibility diagnostics with **compact text format** and **strict mode handling** ✅ **UPDATED**
- `playwright_element_position` - Element coordinates and dimensions with **compact text format**, **strict mode handling**, and **improved hidden element errors** ✅ **UPDATED**
- `playwright_find_by_text` - Text-based element discovery with exact/partial matching ✅ **NEW**
- `playwright_get_computed_styles` - CSS property inspector with grouped output ✅ **NEW**
- `playwright_element_exists` - Ultra-lightweight existence check ✅ **NEW**
- `playwright_compare_positions` - Layout alignment validation tool ✅ **NEW**
- `BrowserToolBase.normalizeSelector()` - Test ID shorthand support ✅

**Recent Enhancements (2025-10-19):**
- ✅ Fixed strict mode violations - all tools now handle multiple element matches gracefully
- ✅ Improved error messages for hidden elements - structured responses instead of errors
- ✅ Added `showAll` parameter to `playwright_get_test_ids` for complete test ID listings
- ✅ Added `showAttributes` parameter to `playwright_query_selector_all` for attribute inspection
- ✅ **Implemented 3 high-priority tools**: `playwright_find_by_text`, `playwright_get_computed_styles`, `playwright_element_exists`
- ✅ **Enhanced `playwright_element_visibility`** with coverage detection (~% covered), covering element details, and interactability state (disabled, readonly, pointer-events)
- ✅ **Enhanced `playwright_get_test_ids`** with duplicate test ID detection and warnings
- ✅ **NEW (Post-Assessment)**: Added `onlyVisible` parameter to `playwright_query_selector_all` for visibility filtering (true=visible only, false=hidden only)
- ✅ **NEW (Post-Assessment)**: Added regex pattern support to `playwright_find_by_text` for advanced text matching (e.g., '/\\d+ items?/' for numbers)

See `IMPLEMENTATION_SUMMARY.md` for full implementation details and test coverage.

---

## 🎯 Production Testing Assessment (2025-10-19)

**Test Environment**: Recipe2 PWA (Next.js 15 + React 19 + Supabase)
**Overall Rating**: ⭐⭐⭐⭐⭐ (5/5)
**Tools Tested**: 8/8 (100%)
**Success Rate**: 100%
**Bugs Found**: 0 critical, 0 minor

### Assessment Summary

All 8 implemented tools were tested in production on a real-world Next.js PWA application. Every tool performed excellently with no bugs or issues detected. The progressive workflow (inspect_dom → get_test_ids → query_selector_all → element debugging) was validated in real scenarios.

**Key Strengths Confirmed**:
- ✅ Automatic wrapper drilling works perfectly (skipped 17+ non-semantic divs)
- ✅ Token efficiency validated (60-75% savings vs JSON)
- ✅ Layout detection accurate (horizontal/vertical patterns)
- ✅ Visibility diagnostics identify root causes correctly
- ✅ Text-based fallback essential for pages without test IDs

### Improvements Implemented Post-Assessment

Based on the assessment recommendations, the following enhancements were immediately implemented:

#### ✅ 1. `playwright_query_selector_all` - Added `onlyVisible` Parameter
**Priority**: High
**Status**: ✅ **COMPLETED**
**Implementation**: 2025-10-19

- **Feature**: Filter results by visibility state
- **Usage**:
  - `onlyVisible: true` → Show only visible elements
  - `onlyVisible: false` → Show only hidden elements
  - `onlyVisible: undefined` → Show all elements (default)
- **Use Case**: "Show me all visible buttons" - now fully supported
- **Tests**: 3 new test cases added and passing

**Example Output**:
```
Found 3 elements matching "button" (2 visible):

[0] <button data-testid="visible-btn">
    @ (100,100) 80x40px
    "Click Me"
    ✓ visible, ⚡ interactive

[1] <button data-testid="another-visible">
    @ (200,100) 80x40px
    "Another"
    ✓ visible, ⚡ interactive

Showing 2 visible matches
```

#### ✅ 2. `playwright_find_by_text` - Added Regex Pattern Support
**Priority**: High
**Status**: ✅ **COMPLETED**
**Implementation**: 2025-10-19

- **Feature**: Advanced text matching with regex patterns
- **Usage**:
  - `{ text: '/\\d+ items?/', regex: true }` → Find elements with numbers
  - `{ text: '/sign.*/i', regex: true }` → Case-insensitive pattern
  - Supports `/pattern/flags` format or raw patterns
- **Use Case**: Find elements matching complex patterns (e.g., prices, counts, dynamic content)
- **Tests**: 4 new test cases added and passing
- **Validation**: Validates regex patterns and returns error for invalid syntax

**Example Output**:
```
Found 3 elements matching regex /\d+ items?/:

[0] <div>
    @ (8,8) 1264x18px
    "3 items"
    ✓ visible

[1] <div>
    @ (8,26) 1264x18px
    "10 items"
    ✓ visible

[2] <div>
    @ (8,62) 1264x18px
    "100 items"
    ✓ visible
```

#### ✅ 3. `playwright_get_test_ids` - Duplicate Detection
**Priority**: Medium
**Status**: ✅ **ALREADY EXISTED**
**Note**: This feature was already fully implemented with comprehensive warnings

- **Feature**: Detects and warns about duplicate test IDs
- **Output**: Shows which test IDs appear multiple times with counts
- **Guidance**: Provides actionable suggestions to fix duplicates
- **Tests**: 2 existing test cases validate this functionality

Full assessment report: `/Users/anton/dev/recipe2/playwright-mcp-tools-evaluation.md`

---

## Key Design Changes from Original Recommendations

1. **Split complex tools** - Tools with 5+ parameters or nested returns split into focused tools
2. **Token-efficient responses** - Compact text format preferred over JSON (60-75% token savings) ✅ **Now implemented in visibility & position tools**
3. **Semantic filtering** - Skip wrapper divs, return only meaningful elements
4. **Single selector parameter** - Use string normalization instead of multiple selector types
5. **Primitive types** - Avoid nested objects in parameters where possible
6. **Symbols over words** - Use ✓✗⚡→↓ instead of verbose field names ✅ **Now implemented in visibility & position tools**

---

## Recommended New Tools (from Production Testing Assessment)

Based on comprehensive testing with real-world applications (Next.js PWA, GitHub, Anthropic) conducted on 2025-10-19, the following tools would add significant value:

### 🔴 High Priority - Layout & Debugging Tools

#### `playwright_find_by_text` - Text-Based Element Discovery
**Use case:** Finding elements without good selectors, especially in poorly structured DOM

```typescript
{
  text: string;              // Text to search for
  exact?: boolean;           // Exact match (default: false)
  caseSensitive?: boolean;   // Case-sensitive search (default: false)
  limit?: number;            // Max results (default: 10)
}
```

**Returns:** Compact text format
```
Found 3 elements containing "Sign in":

[0] <button data-testid="login-btn">
    @ (260,100) 120x40px
    "Sign in"
    ✓ visible, ⚡ interactive

[1] <a href="/login">
    @ (50,20) 80x30px
    "Sign in to your account"
    ✓ visible, ⚡ interactive

[2] <span class="tooltip">
    @ (300,150) 100x20px
    "Sign in required"
    ✗ hidden (opacity: 0)
```

**Why this matters:** Many pages lack test IDs. Text-based search provides fallback for element discovery.

---

#### `playwright_get_computed_styles` - CSS Property Inspector
**Use case:** Understanding why elements behave unexpectedly, debugging layout issues

```typescript
{
  selector: string;
  properties?: string;  // Comma-separated CSS properties (default: common properties)
}
```

**Returns:** Compact text format
```
Computed Styles: <button data-testid="submit">

Layout:
  display: inline-flex
  position: relative
  width: 398px
  height: 36px

Visibility:
  opacity: 1
  visibility: visible
  z-index: auto

Typography:
  font-size: 14px
  font-weight: 500
  color: rgb(255, 255, 255)
```

**Default properties:** `display, position, width, height, opacity, visibility, z-index, overflow, font-size, font-weight, color, background-color`

**Why this matters:** Addresses "Why won't it click?" and layout debugging without needing developer tools.

---

### 🟡 Medium Priority - Advanced Layout Tools

#### `playwright_compare_positions` - Layout Alignment Check
**Use case:** Validating header alignment, ensuring consistent spacing across components

```typescript
{
  selector1: string;
  selector2: string;
  checkAlignment: 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height';
}
```

**Returns:** Compact text format
```
Alignment Check:
<header data-testid="main-header"> vs <header data-testid="chat-header">

Height: ✓ aligned
  main-header: 64px
  chat-header: 64px
  Difference: 0px
```

**Why this matters:** Automates visual regression testing for layout consistency.

---

#### `playwright_measure_overflow` - Viewport Overflow Detection
**Use case:** Mobile layout debugging, identifying scrollable content issues

```typescript
{
  selector?: string;  // Element to check (default: document.body)
}
```

**Returns:** Compact text format
```
Overflow: <body>

Horizontal: ✓ no overflow
  scrollWidth: 1200px
  clientWidth: 1200px

Vertical: ✗ overflow detected
  scrollHeight: 3500px
  clientHeight: 800px
  Overflow by: 2700px (77% below fold)

→ Content extends 2700px beyond viewport
```

**Why this matters:** Critical for mobile testing and responsive design validation.

---

### 🟢 Low Priority - Accessibility & Advanced Features

#### `playwright_get_form_data` - Form Field Extraction
**Use case:** Extract all form fields and their current values for testing

```typescript
{
  selector?: string;  // Form selector, defaults to first form
}
```

**Returns:** Compact text format
```
Form Fields (2 inputs, 1 button):

email (input[type=email])
  value: "user@example.com"
  placeholder: "Enter your email"
  required: true

password (input[type=password])
  value: "••••••••"
  placeholder: "Enter your password"
  required: true
```

**Why this matters:** Quickly understand form structure and state for testing. Essential for debugging form submission issues.

---

#### `playwright_accessibility_tree` - Accessibility Inspection
**Use case:** Testing accessibility, understanding semantic structure for screen readers

```typescript
{
  selector?: string;  // Root element (default: whole page)
  maxDepth?: number;  // Tree depth (default: 3)
}
```

**Returns:** Compact text format
```
Accessibility Tree: <main data-testid="content">

[0] navigation "Main navigation"
    ├─ link "Home"
    ├─ link "About"
    └─ link "Contact"

[1] region "Content area"
    └─ form "Login form"
        ├─ textbox "Email" (required)
        ├─ textbox "Password" (required)
        └─ button "Sign In"
```

**Why this matters:** Enables accessibility testing and understanding how assistive technologies see the page.

---

## Priority Levels
- 🔴 **High Priority** - Addresses critical gaps or frequently needed functionality
- 🟡 **Medium Priority** - Valuable quality-of-life improvements
- 🟢 **Low Priority** - Nice-to-have enhancements

---

## Progressive DOM Discovery Tool

### ✅ IMPLEMENTED: `playwright_inspect_dom`
**Progressive DOM inspection with semantic filtering and spatial layout info.**

**Status:** Fully implemented and tested ✅
**File:** `src/tools/browser/inspectDom.ts`
**Tests:** `src/__tests__/tools/browser/inspectDom.test.ts` (13 test cases passing)

This is the **primary tool for understanding page structure**, replacing the need for multiple separate tools. It combines:
- Page overview (landmark elements)
- Element zoom (progressive drill-down)
- Spatial layout (geometry and relative positioning)
- Semantic filtering (skips wrapper divs)

**Semantic Elements** (what gets returned, non-semantic wrappers skipped):
- Semantic HTML: `header`, `nav`, `main`, `article`, `section`, `aside`, `footer`, `form`, `button`, `input`, `select`, `textarea`, `a`, `h1-h6`, `p`, `ul`, `ol`, `li`, `table`, `img`, `video`, `audio`, `svg`, `canvas`, `iframe`, `dialog`, `details`, `summary`
- Elements with test IDs: `data-testid`, `data-test`, `data-cy`
- Elements with ARIA roles: `role="button"`, `role="dialog"`, etc.
- Interactive elements: Elements with `onclick`, `contenteditable`
- Containers with significant text (>10 chars direct text)

**Parameters:**
```typescript
{
  selector?: string;        // Omit for page overview, provide to zoom into element
  includeHidden?: boolean;  // Default: false
  maxChildren?: number;     // Limit children shown (default: 20)
  maxDepth?: number;        // Maximum depth to drill through non-semantic wrappers (default: 5)
}
```

**Automatic Wrapper Drilling:** The tool recursively drills through non-semantic wrapper elements (div, span, fieldset, etc.) up to `maxDepth` levels (default: 5) to find semantic children. This handles deeply nested UI framework components:
- Plain HTML / Tailwind CSS: 1-3 levels (covered by default)
- Bootstrap: 2-4 levels (covered by default)
- Material-UI: 5-7 levels (mostly covered, use maxDepth: 7 for complex components)
- Ant Design: 6-8 levels (use maxDepth: 7-8 for complex components)
- Chakra UI: 4-6 levels (covered by default)

Set `maxDepth: 1` to see only immediate children without drilling. Increase for pathological nesting cases.

**Handling Poorly Structured DOM:**

When inspecting returns few/no semantic elements (e.g., "Found 0 semantic children, skipped 15 wrapper divs"), the page lacks semantic structure. Options:

1. **Use existing tools**: Try `playwright_get_visible_html` or `playwright_get_visible_text` to see raw content
2. **Suggest improvements**: Recommend adding test IDs, ARIA roles, or semantic HTML to make the page more inspectable
3. **Work with what's available**: Use CSS selectors based on classes/IDs if testids aren't available

The tool will suggest next steps when it encounters non-semantic DOM.

**Returns:** Compact text format (token-efficient)

Example 1 - Well-structured page:
```
DOM Inspection: <main data-testid="content">
@ (0,80) 1200x800px

Children (2 of 2, skipped 3 wrappers):

[0] <aside data-testid="sidebar"> | navigation
    @ (0,80) 250x800px | offset: 0,0 | left
    "Navigation sidebar with 5 menu items"
    ✓ visible, ⚡ interactive, 5 children

[1] <section data-testid="content-area"> | region
    @ (260,75) 940x600px | offset: -5,260 | right
    gap from [0]: →10px ↑5px (horizontal layout)
    "Main content with form"
    ✓ visible, ⚡ interactive, 1 child

Layout: horizontal (sidebar + content)
```

Example 2 - Poorly structured page (guidance provided):
```
DOM Inspection: <div class="container">
@ (0,80) 1200x800px

Children (0 semantic, skipped 12 wrapper divs):

⚠ No semantic elements found at this level.

The page uses generic <div> wrappers without semantic HTML, test IDs, or ARIA roles.

Suggestions:
1. Use playwright_get_visible_html({ selector: ".container" }) to see raw HTML
2. Look for interactive elements by class/id (e.g., .button, #submit-btn)
3. Recommend adding data-testid attributes for better testability

Wrapper divs found (not shown):
  <div class="wrapper">, <div class="content">, <div class="flex-row">, ...

To improve this page's structure, consider:
  - Adding semantic HTML: <header>, <main>, <nav>, <button>
  - Adding test IDs: data-testid="submit-button"
  - Adding ARIA roles: role="button", role="navigation"
```

Example 3 - Mixed structure (some semantic, some wrappers):
```
DOM Inspection: <div id="app-root">
@ (0,0) 1200x1000px

Children (3 semantic, skipped 8 wrapper divs):

[0] <button class="close-btn">
    @ (1150,10) 40x40px
    "×"
    ✓ visible, ⚡ interactive

[1] <div class="user-info" data-testid="user-profile">
    @ (20,20) 200x60px
    "John Doe john@example.com"
    ✓ visible, has test ID

[2] <form class="search-form">
    @ (240,25) 400x50px
    ✓ visible, ⚡ interactive, 2 children

💡 Tip: Some elements found, but 8 wrapper divs were skipped.
   Consider adding test IDs to key elements for easier selection.
```

**Symbols:**
- `✓` = visible, `✗` = hidden
- `⚡` = interactive (clickable/editable)
- `→` = right, `←` = left, `↓` = down, `↑` = up
- `@ (x,y) WxH` = position and size

**Token Efficiency:**
- Page overview: ~120 tokens (vs ~300+ JSON)
- Form with fields: ~150 tokens (vs ~500+ JSON)
- List with 50 items (3 shown): ~190 tokens (vs ~1200+ JSON)

**Workflow (Progressive Drill-Down):**
1. **Overview**: `playwright_inspect_dom({})` → See page sections (header, main, footer)
2. **Zoom Level 1**: `playwright_inspect_dom({ selector: "main" })` → See main content children (sidebar, form, etc.)
3. **Zoom Level 2**: `playwright_inspect_dom({ selector: "testid:login-form" })` → See form fields (inputs, buttons)
4. **Interact**: Use selectors from output with interaction tools (click, fill, etc.)

Each call returns only immediate semantic children - this keeps responses readable and under ~200 tokens even for complex pages.

**Why this tool:**
- **Vision-like focus**: Overview → zoom → detail (mirrors LLM image analysis)
- **Token efficient**: 60-75% fewer tokens than JSON equivalents
- **Spatial awareness**: Geometry + relative positioning for layout understanding
- **Smart omission**: Shows patterns without repeating similar elements
- **Modern web apps**: Filters Material-UI/Tailwind wrapper divs automatically

---

## Test ID Discovery Tool

### ✅ IMPLEMENTED: `playwright_get_test_ids`
Discover all test identifiers on the page (data-testid, data-test, data-cy, etc.).

**Status:** Fully implemented and tested ✅
**File:** `src/tools/browser/getTestIds.ts`
**Tests:** `src/__tests__/tools/browser/getTestIds.test.ts` (13 test cases passing)

**Parameters:**
```typescript
{
  attributes?: string;     // Comma-separated list (default: 'data-testid,data-test,data-cy')
}
```

**Returns:** Compact text format
```
Found 15 test IDs:

data-testid (12):
  submit-button, email-input, password-input, login-form,
  header-nav, footer-links, user-menu, search-bar,
  product-card-1, product-card-2, product-card-3, ...

data-test (2):
  legacy-form, old-button

data-cy (1):
  cypress-login
```

**Token efficiency:** ~100 tokens vs ~250 tokens (JSON format) = **60% savings**

**Why this tool:** Makes test-driven workflows easier. Compact list format shows what's available without token waste.

---

## Recommended Tools for Implementation

This section lists all recommended tools in priority order, merging assessment findings with original recommendations. Similar/duplicate tools have been consolidated to avoid redundancy.

---

## 🔴 High Priority - Critical Gaps & Frequent Needs

### ✅ 1. `playwright_find_by_text` - Text-Based Element Discovery **IMPLEMENTED**
**Priority:** 🔴 **High** | **Source:** Production Testing Assessment | **Status:** ✅ Completed
**Use case:** Finding elements without good selectors, especially in poorly structured DOM

**Parameters:**
```typescript
{
  text: string;              // Text to search for
  exact?: boolean;           // Exact match (default: false)
  caseSensitive?: boolean;   // Case-sensitive search (default: false)
  limit?: number;            // Max results (default: 10)
}
```

**Returns:** Compact text format
```
Found 3 elements containing "Sign in":

[0] <button data-testid="login-btn">
    @ (260,100) 120x40px
    "Sign in"
    ✓ visible, ⚡ interactive

[1] <a href="/login">
    @ (50,20) 80x30px
    "Sign in to your account"
    ✓ visible, ⚡ interactive

[2] <span class="tooltip">
    @ (300,150) 100x20px
    "Sign in required"
    ✗ hidden (opacity: 0)
```

**Token efficiency:** ~150 tokens vs ~400+ tokens (JSON) = **62% savings**

**Why this matters:** Many real-world pages lack test IDs (e.g., Anthropic.com had 0 test IDs). Text-based search provides essential fallback for element discovery. Complements `playwright_inspect_dom` for poorly structured pages.

---

### ✅ 2. `playwright_get_computed_styles` - CSS Property Inspector **IMPLEMENTED**
**Priority:** 🔴 **High** | **Source:** Production Testing Assessment | **Status:** ✅ Completed
**Use case:** Understanding why elements behave unexpectedly, debugging layout issues

**Parameters:**
```typescript
{
  selector: string;
  properties?: string;  // Comma-separated CSS properties (default: common layout properties)
}
```

**Returns:** Compact text format
```
Computed Styles: <button data-testid="submit">

Layout:
  display: inline-flex, position: relative
  width: 398px, height: 36px

Visibility:
  opacity: 1, visibility: visible, z-index: auto

Spacing:
  margin: 0px, padding: 8px 16px
  overflow: visible

Typography:
  font-size: 14px, font-weight: 500
  color: rgb(255, 255, 255)
```

**Default properties:** `display, position, width, height, opacity, visibility, z-index, overflow, margin, padding, font-size, font-weight, color, background-color`

**Token efficiency:** ~120 tokens vs ~300+ tokens (JSON) = **60% savings**

**Why this matters:** Addresses "Why won't it click?" and layout debugging without needing browser developer tools. More focused than `playwright_get_element_attributes` which shows HTML attributes, not computed CSS.

---

### 3. `playwright_list_iframes` - Iframe Discovery
**Priority:** 🔴 **High** | **Source:** Original Recommendations
**Use case:** Finding and debugging iframe-embedded content

**Parameters:**
```typescript
{} // No parameters - keep it simple
```

**Returns:** Compact text format
```
Found 2 iframes:

[0] <iframe#payment-frame name="stripe-payment">
    src: https://checkout.stripe.com/...
    @ (100,200) 400x300px
    "Payment Form"
    ✓ visible

[1] <iframe name="analytics">
    src: https://www.google-analytics.com/...
    @ (0,0) 1x1px
    ✗ hidden (tracking pixel)
```

**Token efficiency:** ~80 tokens vs ~200 tokens (JSON) = **60% savings**

**Why this matters:** Fills critical gap for pages with embedded content (payment forms, chat widgets, etc.). Use with existing `playwright_iframe_click` and `playwright_iframe_fill` tools.

---

### ✅ 4. `playwright_element_exists` - Simple Existence Check **IMPLEMENTED**
**Priority:** 🔴 **High** | **Source:** Original Recommendations | **Status:** ✅ Completed
**Use case:** Quick check if element exists before attempting interaction

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns:** Compact text format
```
✓ exists: <button#login.btn-primary>
```

Or if not found:
```
✗ not found: button#invalid-selector
```

**Token efficiency:** ~15 tokens vs ~80 tokens (JSON) = **81% savings**

**Why this matters:** Most common check before interaction. Ultra-lightweight alternative to `playwright_query_selector_all` when you only need existence confirmation.

---

## 🟡 Medium Priority - High-Value Quality of Life

### ✅ 5. `playwright_compare_positions` - Layout Alignment Validation **IMPLEMENTED**
**Priority:** 🟡 **Medium** | **Source:** Production Testing Assessment | **Status:** ✅ Completed
**Use case:** Validating header alignment, ensuring consistent spacing across components

**Parameters:**
```typescript
{
  selector1: string;
  selector2: string;
  checkAlignment: 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height';
}
```

**Returns:** Compact text format
```
Alignment Check:
<header data-testid="main-header"> vs <header data-testid="chat-header">

Height: ✓ aligned
  main-header: 64px
  chat-header: 64px
  Difference: 0px
```

**Token efficiency:** ~50 tokens vs ~120 tokens (JSON) = **58% savings**

**Why this matters:** Automates visual regression testing for layout consistency. Addresses specific use case from production testing (header alignment validation).

---

### 6. `playwright_measure_overflow` - Viewport Overflow Detection
**Priority:** 🟡 **Medium** | **Source:** Production Testing Assessment
**Use case:** Mobile layout debugging, identifying scrollable content issues

**Parameters:**
```typescript
{
  selector?: string;  // Element to check (default: document.body)
}
```

**Returns:** Compact text format
```
Overflow: <body>

Horizontal: ✓ no overflow
  scrollWidth: 1200px, clientWidth: 1200px

Vertical: ✗ overflow detected
  scrollHeight: 3500px, clientHeight: 800px
  Overflow by: 2700px (77% below fold)

→ Content extends 2700px beyond viewport
```

**Token efficiency:** ~90 tokens vs ~200 tokens (JSON) = **55% savings**

**Why this matters:** Critical for mobile testing and responsive design validation. Complements `playwright_element_position` for understanding page layout.

---

### 7. `playwright_element_interaction_state` - Interaction Capability Check
**Priority:** 🟡 **Medium** | **Source:** Original Recommendations
**Use case:** Debug form issues, understand why element won't accept input

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns:** Compact text format
```
Interaction State: <input data-testid="email">

✓ enabled, ✓ editable, ✗ not focused
✗ not disabled, ✗ not readOnly, ✗ not aria-disabled
Value: "user@example.com"
```

Or more concisely for common cases:
```
✓ enabled, editable, focused
```

**Token efficiency:** ~50 tokens vs ~150 tokens (JSON) = **67% savings**

**Why this matters:** Complements `playwright_element_visibility` for interaction debugging. Focused on form state rather than visibility.

---

### 8. `playwright_scroll_to_element` - Scroll Element Into View
**Priority:** 🟡 **Medium** | **Source:** Original Recommendations
**Use case:** Bring element into viewport before interaction

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns:** Compact text format
```
✓ Scrolled, now 100% in viewport
```

Or if already visible:
```
Already in viewport (85% visible), no scroll needed
```

**Token efficiency:** ~20 tokens vs ~90 tokens (JSON) = **78% savings**

**Why this matters:** Direct complement to `playwright_element_visibility`. When visibility tool returns `⚠ needs scroll`, call this before clicking/interacting.

---

### 9. `playwright_list_network_requests` - Network Activity List
**Priority:** 🟡 **Medium** | **Source:** Original Recommendations
**Use case:** Debugging API calls, monitoring network activity

**Parameters:**
```typescript
{
  type?: string;           // 'xhr', 'fetch', 'script', 'image', etc.
  limit?: number;          // Default: 50
}
```

**Returns:** Compact text format
```
Network Requests (15 of 50, recent first):

[0] GET /api/users 200 OK | xhr | 145ms | cached
[1] POST /api/login 200 OK | fetch | 320ms | 2.1KB
[2] GET /styles.css 200 OK | stylesheet | 45ms | cached
[3] GET /app.js 200 OK | script | 280ms | 125KB
[4] GET /logo.png 200 OK | image | 80ms | cached
[5] GET /api/profile 401 Unauthorized | xhr | 25ms
...

Omitted: 35 older requests
Use playwright_get_request_details(index) for full info
```

**Token efficiency:** ~150 tokens vs ~600+ tokens (JSON) = **75% savings**

**Why this matters:** Essential for debugging API integration issues. Two-step list→detail pattern saves massive tokens.

---

### 10. `playwright_get_request_details` - Network Request Inspector
**Priority:** 🟡 **Medium** | **Source:** Original Recommendations
**Use case:** Deep inspection of specific network request

**Parameters:**
```typescript
{
  index: number;           // From list_network_requests
}
```

**Returns:** Compact text format
```
Request Details [1]:

POST https://api.example.com/login
Status: 200 OK (took 320ms)
Size: 234 bytes → 1.2KB

Request Headers:
  content-type: application/json
  authorization: Bearer eyJ...

Request Body:
  {"email":"user@example.com","password":"***"}

Response Headers:
  content-type: application/json
  set-cookie: session=abc123; HttpOnly

Response Body (truncated at 500 chars):
  {"token":"eyJhbGc...","user":{"id":123,"name":"John Doe"}}
  ... [700 more bytes]
```

**Token efficiency:** ~200 tokens vs ~400 tokens (JSON) = **50% savings**

**Why this matters:** Pair with `playwright_list_network_requests` for complete network debugging workflow. Auto-truncates large bodies to save tokens.

---

### 11. `playwright_wait_for_element` - State-Based Waiting
**Priority:** 🟡 **Medium** | **Source:** Original Recommendations
**Use case:** Better than arbitrary sleep() calls, wait for specific element state

**Parameters:**
```typescript
{
  selector: string;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';  // Default: 'visible'
  timeout?: number;        // Default: 30000
}
```

**Returns:** Compact text format
```
✓ Element visible after 1.2s
Now: ✓ visible, ✓ exists
```

Or on timeout:
```
✗ Timeout after 30s waiting for visible
Now: ✗ hidden, ✓ exists
```

**Token efficiency:** ~30 tokens vs ~100 tokens (JSON) = **70% savings**

**Why this matters:** Replaces unreliable sleep() calls with deterministic waits. Shows current state for debugging.

---

## 🟢 Low Priority - Nice-to-Have Enhancements

### 12. `playwright_accessibility_tree` - Accessibility Inspector
**Priority:** 🟢 **Low** | **Source:** Production Testing Assessment (enhanced from original `get_accessibility_snapshot`)
**Use case:** Testing accessibility, understanding semantic structure for screen readers

**Parameters:**
```typescript
{
  selector?: string;  // Root element (default: whole page)
  maxDepth?: number;  // Tree depth (default: 3)
}
```

**Returns:** Compact text format
```
Accessibility Tree: <main data-testid="content">

[0] navigation "Main navigation"
    ├─ link "Home"
    ├─ link "About"
    └─ link "Contact"

[1] region "Content area"
    └─ form "Login form"
        ├─ textbox "Email" (required)
        ├─ textbox "Password" (required)
        └─ button "Sign In"
```

**Token efficiency:** ~150 tokens vs ~400+ tokens (JSON) = **62% savings**

**Why this matters:** Enables accessibility testing and understanding how assistive technologies see the page. Tree format is more useful than single-element snapshot.

---

### 13. `playwright_get_cookies` / `playwright_set_cookie` - Cookie Management
**Priority:** 🟢 **Low** | **Source:** Original Recommendations
**Use case:** Auth workflows, session management testing

**Get Cookies Parameters:**
```typescript
{
  names?: string;  // Comma-separated cookie names (optional filter)
}
```

**Get Cookies Returns:**
```
Cookies (3):

session_id
  Value: abc123xyz...
  Domain: example.com | Path: / | Expires: 2025-12-31
  ✓ Secure, ✓ HttpOnly, SameSite: Strict

auth_token
  Value: eyJhbGc...
  Domain: .example.com | Path: / | Session cookie
  ✓ Secure, ✗ HttpOnly, SameSite: Lax
```

**Set Cookie Parameters:**
```typescript
{
  name: string;
  value: string;
  domain?: string;
  path?: string;           // Default: '/'
  expires?: number;        // Unix timestamp
  httpOnly?: boolean;      // Default: false
  secure?: boolean;        // Default: false
  sameSite?: string;       // Default: 'Lax'
}
```

**Set Cookie Returns:**
```
✓ Cookie 'session_id' set for example.com
```

**Token efficiency:** Get: ~180 tokens vs ~350 (JSON) = 48% savings | Set: ~15 tokens vs ~30 (JSON) = 50% savings

**Why this matters:** Useful for auth testing, but lower priority as most frameworks handle cookies automatically.

---

### 14. `playwright_wait_for_network_idle` - Network Settling
**Priority:** 🟢 **Low** | **Source:** Original Recommendations
**Use case:** Wait for all network activity to complete

**Parameters:**
```typescript
{
  timeout?: number;  // Default: 30000
}
```

**Returns:** Compact text format
```
✓ Network idle after 850ms, 0 pending requests
```

Or on timeout:
```
✗ Timeout after 30000ms, 3 requests still pending
```

**Token efficiency:** ~20 tokens vs ~80 tokens (JSON) = **75% savings**

**Why this matters:** Useful for SPAs, but modern frameworks often have better loading indicators. Use sensible defaults.

---

### 15. `playwright_get_element_text` - Text Content Extraction
**Priority:** 🟢 **Low** | **Source:** Original Recommendations
**Use case:** Extract text content from specific element

**Parameters:**
```typescript
{
  selector: string;
  trim?: boolean;  // Default: true
}
```

**Returns:** Direct text
```
Lorem ipsum dolor sit amet, consectetur adipiscing elit...
(234 characters)
```

Or for empty:
```
(empty - 0 characters)
```

**Token efficiency:** Direct text return = **60% savings** vs JSON wrapper

**Why this matters:** Lower priority as `playwright_query_selector_all` and `playwright_inspect_dom` already show text content. Useful for focused extraction only.

---

### 16. `playwright_get_performance_timing` - Page Load Metrics
**Priority:** 🟢 **Low** | **Source:** Original Recommendations
**Use case:** Performance analysis and monitoring

**Parameters:**
```typescript
{} // No parameters
```

**Returns:** Compact text format
```
Performance Timing:

DOMContentLoaded: 450ms
Load: 1200ms
First Paint: 380ms
First Contentful Paint: 420ms

(all relative to navigation start)
```

**Token efficiency:** ~50 tokens vs ~120 tokens (JSON) = **58% savings**

**Why this matters:** Useful for performance testing, but not essential for most workflows.

---

### 17. `playwright_get_local_storage` / `playwright_get_session_storage` - Storage Inspection
**Priority:** 🟢 **Low** | **Source:** Original Recommendations
**Use case:** Debugging state persistence issues

**Parameters:**
```typescript
{
  keys?: string;  // Comma-separated keys (optional)
}
```

**Returns:** Compact text format
```
localStorage (5 items):

theme: dark
language: en-US
user_preferences: {"notifications":true,"autoSave":false}
session_start: 2025-01-19T10:30:00Z
cart_items: [{"id":123,"qty":2},{"id":456,"qty":1}]
```

**Token efficiency:** ~100 tokens vs ~180 tokens (JSON) = **44% savings**

**Why this matters:** Useful for debugging, but lower priority as storage issues are less common.

---

## ❌ Tools NOT Recommended (Duplicates/Superseded)

### `playwright_get_element_attributes` - **SUPERSEDED**
**Why not:** `playwright_query_selector_all` now has `showAttributes` parameter that provides this functionality. Adding a separate tool would be redundant.

**Use instead:** `playwright_query_selector_all({ selector: "button", showAttributes: "id,name,aria-label" })`

---

### `playwright_get_accessibility_snapshot` (single element) - **SUPERSEDED**
**Why not:** Replaced by `playwright_accessibility_tree` which provides tree structure instead of flat snapshot. Tree format is more useful for understanding semantic hierarchy.

**Use instead:** `playwright_accessibility_tree({ selector: "button", maxDepth: 1 })` for single element

---

## Reference: Detailed Tool Specifications

The sections above ("Progressive DOM Discovery Tool", "Test ID Discovery Tool") contain full implementation details for completed tools. For tools recommended for implementation, see the "Recommended Tools for Implementation" section above with complete specifications.

---

## Design Patterns

All tools in this server follow consistent design principles detailed in `TOOL_DESIGN_PRINCIPLES.md`:

- **Atomic operations** - Each tool does ONE thing
- **Minimal parameters** - 1-3 parameters ideal, max 5
- **Primitive types** - Strings, numbers, booleans preferred over nested objects
- **Token-efficient responses** - Compact text format (60-75% token savings vs JSON)
- **Semantic filtering** - Skip wrapper divs, show only meaningful elements
- **Symbols over words** - ✓✗⚡→↓ instead of verbose field names
- **Single selector parameter** - String normalization handles multiple formats
- **Error as results** - Errors returned in ToolResponse, not thrown

---

## ✅ Selector Normalization (All Tools) - **IMPLEMENTED**

**Implementation:** `src/tools/browser/base.ts` - `normalizeSelector()` method
**Status:** Available in all browser tools extending `BrowserToolBase`
Check if an element is visible to the user. **CRITICAL for debugging click/interaction failures.**

**Implementation:** `src/tools/browser/elementVisibility.ts`
**Tests:** `src/__tests__/tools/browser/elementVisibility.test.ts`
**Status:** Fully implemented and tested (13 test cases passing) ✅

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns: Compact text format** ✅
```
Visibility: <button data-testid="submit">

✓ visible, ✗ not in viewport (30% visible)
opacity: 1.0, display: block, visibility: visible

Issues:
  ✗ clipped by parent overflow:hidden
  ⚠ needs scroll to bring into view

→ Call playwright_scroll_to_element before clicking
```

**Token efficiency:** ~100 tokens vs ~180 tokens (JSON format) = **44% savings** ✅

**Real-world debugging:**
- `✓ visible, ✗ not in viewport` → Element needs scroll
- `30% visible` → Only partially in viewport, might fail click
- `✗ clipped` → Parent has `overflow:hidden`
- `⚠ needs scroll` → Call `playwright_scroll_to_element` before interacting

**Why split:** Focused only on visibility. Provides actionable debugging info for the most common interaction failures.

---

### ✅ 4. `playwright_element_position` (SPLIT from get_element_state) - **IMPLEMENTED**
Get the position and size of an element.

**Implementation:** `src/tools/browser/elementPosition.ts`
**Tests:** `src/__tests__/tools/browser/elementPosition.test.ts`
**Status:** Fully implemented and tested (6 test cases passing) ✅

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns: Compact text format** ✅
```
Position: <button data-testid="submit">
@ (260,100) 120x40px, ✓ in viewport
```

**Token efficiency:** ~30 tokens vs ~100 tokens (JSON format) = **70% savings** ✅

**Why split:** Focused only on layout/position. Separate from visibility concerns. Ultra-compact format ideal for simple geometry data.

---

### ⚠️ 5. `playwright_element_interaction_state` (SPLIT from get_element_state)
Check if element can be interacted with.

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns:** Compact text format
```
Interaction State: <button data-testid="submit">

✓ enabled, ✓ editable, ✓ focused
✗ not checked (N/A for button)
✗ not disabled, ✗ not readOnly, ✗ not aria-disabled
```

Or more concisely for common cases:
```
✓ enabled, editable, focused
```

**Token efficiency:** ~50 tokens vs ~150 tokens (JSON format) = **67% savings**

**Why split:** Focused on interaction capability. Symbols make state immediately scannable.

---

### 🔴 6. `playwright_list_iframes`
List all iframes on the page.

**Parameters:**
```typescript
{
  // No parameters - keep it simple
}
```

**Returns:** Compact text format
```
Found 2 iframes:

[0] <iframe#payment-frame name="stripe-payment">
    src: https://checkout.stripe.com/...
    @ (100,200) 400x300px
    "Payment Form"

[1] <iframe name="analytics">
    src: https://www.google-analytics.com/...
    @ (0,0) 1x1px
    ✗ hidden (tracking pixel)
```

**Token efficiency:** ~80 tokens vs ~200 tokens (JSON format) = **60% savings**

**Design note:** Compact format shows essential info. Use index with iframe-specific tools (playwright_iframe_click, etc.).

---

### 🟡 7. `playwright_get_element_attributes`
Get all attributes of a specific element.

**Parameters:**
```typescript
{
  selector: string;
  filter?: string;         // Comma-separated attribute names (optional)
}
```

**Returns:** Compact text format
```
Attributes: <button data-testid="submit" aria-label="Submit form">

All:
  id: submit-btn
  class: btn btn-primary
  type: submit
  disabled: false

Data:
  data-testid: submit
  data-action: login
  data-analytics: click-submit

ARIA:
  aria-label: Submit form
  aria-describedby: submit-help
```

**Token efficiency:** ~120 tokens vs ~200 tokens (JSON format) = **40% savings**

**Design note:** Grouped attributes by type for clarity. Skip empty groups to save tokens.

---

### 🟡 8. `playwright_get_accessibility_snapshot`
Get accessibility information for an element.

**Parameters:**
```typescript
{
  selector?: string;       // Default: whole page
}
```

**Returns:** Compact text format
```
Accessibility: <button data-testid="submit">

Role: button
Name: "Submit form"
Value: ""
State: ✓ enabled, ✓ focused
Level: 0
Description: "Click to submit the login form"
```

**Token efficiency:** ~70 tokens vs ~140 tokens (JSON format) = **50% savings**

**Design note:** Single level only (no children tree). Use symbols for state. LLM can call recursively on child selectors if needed.

---

## Network & Performance Tools

### ⚠️ 9. `playwright_list_network_requests` (SPLIT from get_network_activity)
List recent network requests.

**Parameters:**
```typescript
{
  type?: string;           // 'xhr', 'fetch', 'script', 'image', etc.
  limit?: number;          // Default: 50
}
```

**Returns:** Compact text format
```
Network Requests (15 of 50, recent first):

[0] GET /api/users 200 OK | xhr | 145ms | cached
[1] POST /api/login 200 OK | fetch | 320ms | 2.1KB
[2] GET /styles.css 200 OK | stylesheet | 45ms | cached
[3] GET /app.js 200 OK | script | 280ms | 125KB
[4] GET /logo.png 200 OK | image | 80ms | cached
[5] GET /api/profile 401 Unauthorized | xhr | 25ms
...

Omitted: 35 older requests (indexes 15-49)
Use playwright_get_request_details(index) for full info
```

**Token efficiency:** ~150 tokens vs ~600+ tokens (JSON format) = **75% savings**

**Why split:** Original had 6 parameters. Compact list + detail pattern saves massive tokens for network debugging.

---

### ⚠️ 10. `playwright_get_request_details` (SPLIT from get_network_activity)
Get detailed information about a specific network request.

**Parameters:**
```typescript
{
  index: number;           // From list_network_requests
}
```

**Returns:** Compact text format
```
Request Details [1]:

POST https://api.example.com/login
Status: 200 OK (took 320ms)
Size: 234 bytes → 1.2KB

Request Headers:
  content-type: application/json
  authorization: Bearer eyJ...

Request Body:
  {"email":"user@example.com","password":"***"}

Response Headers:
  content-type: application/json
  set-cookie: session=abc123; HttpOnly

Response Body (truncated at 500 chars):
  {"token":"eyJhbGc...","user":{"id":123,"name":"John Doe"}}
  ... [700 more bytes]
```

**Token efficiency:** ~200 tokens vs ~400 tokens (JSON format) = **50% savings**

**Why split:** Two-step list→detail pattern. Shows critical debugging info in readable format. Auto-truncates large bodies.

---

### 🟡 11. `playwright_wait_for_network_idle`
Wait for network activity to settle.

**Parameters:**
```typescript
{
  timeout?: number;        // Default: 30000
}
```

**Returns:** Compact text format
```
✓ Network idle after 850ms, 0 pending requests
```

Or on timeout:
```
✗ Timeout after 30000ms, 3 requests still pending
```

**Token efficiency:** ~20 tokens vs ~80 tokens (JSON format) = **75% savings**

**Design note:** Simplified - removed idleDuration and maxInflight params. Use sensible defaults. Ultra-compact result.

---

### 🟢 12. `playwright_get_performance_timing`
Get page load performance timing.

**Parameters:**
```typescript
{} // No parameters
```

**Returns:** Compact text format
```
Performance Timing:

DOMContentLoaded: 450ms
Load: 1200ms
First Paint: 380ms
First Contentful Paint: 420ms

(all relative to navigation start)
```

**Token efficiency:** ~50 tokens vs ~120 tokens (JSON format) = **58% savings**

**Design note:** Simple timing metrics in readable format. No nested objects.

---

## Advanced Interaction Tools

### 🟡 13. `playwright_wait_for_element`
Wait for element to reach a specific state.

**Parameters:**
```typescript
{
  selector: string;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';  // Default: 'visible'
  timeout?: number;        // Default: 30000
}
```

**Returns:** Compact text format
```
✓ Element visible after 1.2s
Now: ✓ visible, ✓ exists
```

Or on timeout:
```
✗ Timeout after 30s waiting for visible
Now: ✗ hidden, ✓ exists
```

**Token efficiency:** ~30 tokens vs ~100 tokens (JSON format) = **70% savings**

**Design note:** 3 parameters, ultra-compact return. Clear success/failure indication with current state.

---

### 🟡 14. `playwright_get_cookies`
Get cookies for current page.

**Parameters:**
```typescript
{
  names?: string;          // Comma-separated cookie names (optional filter)
}
```

**Returns:** Compact text format
```
Cookies (3):

session_id
  Value: abc123xyz...
  Domain: example.com | Path: / | Expires: 2025-12-31
  ✓ Secure, ✓ HttpOnly, SameSite: Strict

auth_token
  Value: eyJhbGc...
  Domain: .example.com | Path: / | Session cookie
  ✓ Secure, ✗ HttpOnly, SameSite: Lax

tracking
  Value: GA1.2.123...
  Domain: .google.com | Path: / | Expires: 2026-01-01
  ✗ Secure, ✗ HttpOnly, SameSite: None
```

**Token efficiency:** ~180 tokens vs ~350 tokens (JSON format) = **48% savings**

**Design note:** Grouped cookie properties. Symbols for security flags make scanning easier.

---

### 🟡 15. `playwright_set_cookie`
Set a single cookie.

**Parameters:**
```typescript
{
  name: string;
  value: string;
  domain?: string;
  path?: string;           // Default: '/'
  expires?: number;        // Unix timestamp
  httpOnly?: boolean;      // Default: false
  secure?: boolean;        // Default: false
  sameSite?: string;       // Default: 'Lax'
}
```

**Returns:** Compact text format
```
✓ Cookie 'session_id' set for example.com
```

**Token efficiency:** ~15 tokens vs ~30 tokens (JSON format) = **50% savings**

**Design note:** Single cookie instead of array. LLM calls multiple times for multiple cookies. Ultra-compact confirmation.

---

### 🟢 16. `playwright_get_local_storage`
Get localStorage contents.

**Parameters:**
```typescript
{
  keys?: string;           // Comma-separated keys (optional)
}
```

**Returns:** Compact text format
```
localStorage (5 items):

theme: dark
language: en-US
user_preferences: {"notifications":true,"autoSave":false}
session_start: 2025-01-19T10:30:00Z
cart_items: [{"id":123,"qty":2},{"id":456,"qty":1}]
```

**Token efficiency:** ~100 tokens vs ~180 tokens (JSON format) = **44% savings**

**Design note:** Simple key-value list. JSON values displayed as-is for readability.

---

### 🟢 17. `playwright_get_session_storage`
Get sessionStorage contents.

**Parameters:**
```typescript
{
  keys?: string;           // Comma-separated keys (optional)
}
```

**Returns:** Compact text format
```
sessionStorage (3 items):

temp_form_data: {"email":"user@example.com","step":2}
wizard_state: in-progress
last_action: 2025-01-19T10:32:15Z
```

**Token efficiency:** ~80 tokens vs ~140 tokens (JSON format) = **43% savings**

**Design note:** Same format as localStorage for consistency.

---

## Content Extraction Improvements

### 🟡 18. `playwright_get_element_text`
Get text content of a specific element.

**Parameters:**
```typescript
{
  selector: string;
  trim?: boolean;          // Default: true
}
```

**Returns:** Compact text format
```
Lorem ipsum dolor sit amet, consectetur adipiscing elit...
(234 characters)
```

Or for empty text:
```
(empty - 0 characters)
```

**Token efficiency:** Direct text return instead of JSON wrapper = **60% savings** for short text

**Design note:** Return text directly with length note. No JSON wrapper needed for simple text extraction.

---

### 🟡 19. `playwright_scroll_to_element`
Scroll an element into view. **Complements `playwright_element_visibility`.**

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns:** Compact text format
```
✓ Scrolled, now 100% in viewport
```

Or if already visible:
```
Already in viewport (85% visible), no scroll needed
```

**Token efficiency:** ~20 tokens vs ~90 tokens (JSON format) = **78% savings**

**Use case:** When `playwright_element_visibility` returns `⚠ needs scroll`, call this before clicking/interacting.

**Design note:** Wraps Playwright's `scrollIntoViewIfNeeded()`. Ultra-compact confirmation with visibility ratio.

---

## ✅ Selector Normalization (All Tools) - **IMPLEMENTED**

**Implementation:** `src/tools/browser/base.ts` - `normalizeSelector()` method
**Status:** Available in all browser tools extending `BrowserToolBase`

All tools accepting `selector` parameter support these shorthand formats:

```typescript
// Standard CSS selectors
"#login-button"
".submit-btn"
"button[type='submit']"

// Playwright text selector
"text=Login"
"text=/Sign.*/"

// Test ID shorthand (auto-converted)
"testid:submit-button"    → "[data-testid='submit-button']"
"data-test:login-form"    → "[data-test='login-form']"
"data-cy:username-input"  → "[data-cy='username-input']"
```

**Implementation:** Add `normalizeSelector()` helper to `BrowserToolBase` (see TOOL_DESIGN_PRINCIPLES.md).

---

## Implementation Summary

### ✅ Completed Tools (2025-10-20 Update)
9 core tools fully implemented with recent enhancements:

- **`playwright_inspect_dom`** - Progressive DOM discovery with semantic filtering ✅
- **`playwright_get_test_ids`** - Test ID discovery (enhanced with `showAll` parameter) ✅
- **`playwright_query_selector_all`** - Selector debugging (enhanced with `showAttributes` parameter) ✅
- **`playwright_element_visibility`** - Visibility diagnostics (strict mode handling, compact text format) ✅
- **`playwright_element_position`** - Position inspection (strict mode handling, improved hidden element handling) ✅
- **`playwright_find_by_text`** - Text-based element discovery (exact/partial matching, case sensitivity) ✅
- **`playwright_get_computed_styles`** - CSS property inspector (grouped by category) ✅
- **`playwright_element_exists`** - Ultra-lightweight existence check ✅
- **`playwright_compare_positions`** - Layout alignment validation (top/left/right/bottom/width/height) ✅
- **Selector normalization** - Test ID shortcuts (testid:, data-test:, data-cy:) ✅

### 📋 Recommended for Implementation
14 tools remain, deduplicated and prioritized:

**🔴 High Priority (1 tool):**
1. `playwright_list_iframes` - Iframe discovery (payment forms, chat widgets)

**🟡 Medium Priority (6 tools):**
2. `playwright_measure_overflow` - Viewport overflow (mobile debugging)
3. `playwright_element_interaction_state` - Form state debugging
4. `playwright_scroll_to_element` - Bring element into viewport
5. `playwright_list_network_requests` - Network activity list
6. `playwright_get_request_details` - Request detail inspector
7. `playwright_wait_for_element` - State-based waiting

**🟢 Low Priority (7 tools):**
8. `playwright_get_form_data` - Form field extraction (NEW from assessment)
9. `playwright_accessibility_tree` - A11y testing
10. `playwright_get_cookies` / `playwright_set_cookie` - Cookie management (2 tools)
11. `playwright_wait_for_network_idle` - Network settling
12. `playwright_get_element_text` - Text extraction
13. `playwright_get_performance_timing` - Performance metrics
14. `playwright_get_local_storage` / `playwright_get_session_storage` - Storage inspection (2 tools)

**❌ Not Recommended (2 superseded tools):**
- `playwright_get_element_attributes` → Use `query_selector_all` with `showAttributes`
- `playwright_get_accessibility_snapshot` → Use `playwright_accessibility_tree`

**Total: 23 tools** (9 implemented + 14 recommended)

---

## Comparison: Original vs Revised

| Tool | Original Params | Revised Params | Change Reason |
|------|----------------|----------------|---------------|
| `get_element_state` | 1 | SPLIT into 4 tools | 10+ return fields → atomic tools |
| `get_network_activity` | 5 | SPLIT into 2 tools | Too many params → list/detail pattern |
| `set_cookies` | 1 (array) | 1 (single) | Array → single, call multiple times |
| `list_iframes` | 1 | 0 | Removed optional param for simplicity |
| `get_test_ids` | - | NEW | Enable test-driven workflows |
| `element_visibility` | JSON output | Compact text ✅ | 44% token savings with symbols |
| `element_position` | JSON output | Compact text ✅ | 70% token savings with symbols |

---

## Design Principles Applied

✅ **Atomic operations** - Each tool does ONE thing
✅ **Fewer parameters** - Most tools have 1-3 params, max 5
✅ **Primitive types** - Strings, numbers, booleans preferred
✅ **Token-efficient responses** - Compact text format (60-75% token savings vs JSON)
✅ **Semantic filtering** - Skip wrapper divs, show only meaningful elements
✅ **Symbols over words** - ✓✗⚡→↓ instead of verbose field names
✅ **Single selector param** - String normalization handles multiple formats
✅ **Clear naming** - Tool names describe exact behavior
✅ **Error as results** - Errors returned in ToolResponse, not thrown

**Research-backed**: Based on 2024-2025 studies showing JSON costs 2x tokens vs compact formats, and Anthropic's findings that concise responses use ⅓ tokens vs detailed JSON.

See `TOOL_DESIGN_PRINCIPLES.md` for detailed rationale and research sources.

---

## Implementation Notes

### Critical: `playwright_element_visibility`

This tool addresses the **#1 debugging pain point**: "Why won't it click?"

**Playwright APIs to use:**
```typescript
// Basic visibility (doesn't check viewport)
const isVisible = await locator.isVisible();

// Viewport intersection with ratio
const isInViewport = await expect(locator).toBeInViewport({ ratio: 0 });
const viewportRatio = /* Calculate using IntersectionObserver */

// Get ratio by evaluating in browser:
const viewportRatio = await page.locator(selector).evaluate((element) => {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Calculate visible area
  const visibleTop = Math.max(0, rect.top);
  const visibleBottom = Math.min(viewportHeight, rect.bottom);
  const visibleLeft = Math.max(0, rect.left);
  const visibleRight = Math.min(viewportWidth, rect.right);

  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const visibleWidth = Math.max(0, visibleRight - visibleLeft);
  const visibleArea = visibleHeight * visibleWidth;

  const totalArea = rect.height * rect.width;
  return totalArea > 0 ? visibleArea / totalArea : 0;
});

// Check if clipped by overflow:hidden
const isClipped = await page.locator(selector).evaluate((element) => {
  const rect = element.getBoundingClientRect();
  let parent = element.parentElement;

  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.overflow === 'hidden' || parentStyle.overflowX === 'hidden' || parentStyle.overflowY === 'hidden') {
      const parentRect = parent.getBoundingClientRect();
      // Check if element is outside parent bounds
      if (rect.right < parentRect.left || rect.left > parentRect.right ||
          rect.bottom < parentRect.top || rect.top > parentRect.bottom) {
        return true;
      }
    }
    parent = parent.parentElement;
  }
  return false;
});

// Check if covered (approximate - check center point)
const isCovered = await page.locator(selector).evaluate((element) => {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const topElement = document.elementFromPoint(centerX, centerY);
  return topElement !== element && !element.contains(topElement);
});

// Needs scroll = visible but not in viewport
const needsScroll = isVisible && !isInViewport;
```

**Why this matters:**
- LLM tries to click → fails
- LLM calls `playwright_element_visibility`
- Returns: `isVisible=true, isInViewport=false, needsScroll=true`
- LLM calls `playwright_scroll_to_element` → click succeeds

### Test ID Discovery: `playwright_get_test_ids`

```typescript
const testIds = await page.evaluate(() => {
  const attributes = ['data-testid', 'data-test', 'data-cy'];
  const results = { testIds: [], byAttribute: {} };

  attributes.forEach(attr => {
    const elements = document.querySelectorAll(`[${attr}]`);
    results.byAttribute[attr] = [];

    elements.forEach(el => {
      const value = el.getAttribute(attr);
      results.testIds.push({
        attribute: attr,
        value: value,
        tagName: el.tagName.toLowerCase(),
        selector: `[${attr}="${value}"]`,
        textContent: el.textContent?.trim().slice(0, 50) || '',
        isVisible: /* check visibility */
      });
      results.byAttribute[attr].push(value);
    });
  });

  return results;
});
```

---

## Next Steps

1. Review revised recommendations
2. Implement Phase 1 tools first (highest value)
3. Add `normalizeSelector()` helper to `BrowserToolBase`
4. Implement visibility detection logic (see code above)
5. Write tests for each new tool
6. Update MCP server documentation
7. Consider adding examples to tool descriptions
