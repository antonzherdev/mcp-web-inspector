# Playwright MCP Server - Tool Recommendations (Revised)

**IMPORTANT:** This document has been revised based on LLM tool calling best practices research (2024-2025). See `TOOL_DESIGN_PRINCIPLES.md` for detailed design rationale.

## 🎉 Implementation Status

**Completed:** 5 tools + selector normalization helper
**Total Remaining:** 14 tools

### ✅ Recently Implemented
- `playwright_inspect_dom` - **PRIMARY TOOL** - Progressive DOM inspection with semantic filtering ✅
- `playwright_get_test_ids` - Discover all test identifiers on the page ✅
- `playwright_query_selector_all` - Test selectors and debug element matches ✅ **NEW**
- `playwright_element_visibility` - Comprehensive visibility diagnostics ✅
- `playwright_element_position` - Element coordinates and dimensions ✅
- `BrowserToolBase.normalizeSelector()` - Test ID shorthand support ✅

See `IMPLEMENTATION_SUMMARY.md` for full implementation details and test coverage.

---

## Key Design Changes from Original Recommendations

1. **Split complex tools** - Tools with 5+ parameters or nested returns split into focused tools
2. **Token-efficient responses** - Compact text format preferred over JSON (60-75% token savings)
3. **Semantic filtering** - Skip wrapper divs, return only meaningful elements
4. **Single selector parameter** - Use string normalization instead of multiple selector types
5. **Primitive types** - Avoid nested objects in parameters where possible
6. **Symbols over words** - Use ✓✗⚡→↓ instead of verbose field names

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

## Content Analysis & Debugging Tools

### ✅ 1. `playwright_query_selector_all` - **IMPLEMENTED**
Test a selector and return information about all matched elements.

**Status:** Fully implemented and tested ✅
**File:** `src/tools/browser/querySelectorAll.ts`
**Tests:** `src/__tests__/tools/browser/querySelectorAll.test.ts` (17 test cases passing)

**Parameters:**
```typescript
{
  selector: string;        // CSS, text, or testid:value shorthand
  limit?: number;          // Max elements to return (default: 10)
}
```

**Returns:** Compact text format
```
Found 3 elements matching "button.submit":

[0] <button data-testid="submit-main" class="submit primary">
    @ (260,100) 120x40px
    "Sign In"
    ✓ visible, ⚡ interactive

[1] <button data-testid="submit-secondary" class="submit">
    @ (400,100) 120x40px
    "Continue"
    ✓ visible, ⚡ interactive

[2] <button#disabled-submit class="submit disabled">
    @ (260,200) 120x40px
    "Submit"
    ✗ hidden, opacity: 0.3

Showing 3 of 3 matches
```

**Token efficiency:** ~150 tokens vs ~400 tokens (JSON format) = **62% savings**

**Design note:** Compact text with symbols makes results scannable. Use index numbers with other tools to interact.

---

### ⚠️ 2. `playwright_element_exists` (SPLIT from get_element_state)
Check if element exists and get basic info.

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

**Token efficiency:** ~15 tokens vs ~80 tokens (JSON format) = **81% savings**

**Why split:** Original `get_element_state` had 10+ return fields. This focuses on existence check with minimal tokens.

---

### ✅ 3. `playwright_element_visibility` (SPLIT from get_element_state) - **IMPLEMENTED**
Check if an element is visible to the user. **CRITICAL for debugging click/interaction failures.**

**Implementation:** `src/tools/browser/elementInspection.ts`
**Tests:** `src/__tests__/tools/browser/elementInspection.test.ts`
**Status:** Fully implemented and tested (13 test cases passing)

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns (Current - JSON):**
```typescript
{
  isVisible: boolean;
  isInViewport: boolean;
  viewportRatio: number;
  opacity: number;
  display: string;
  visibility: string;
  isClipped: boolean;
  isCovered: boolean;
  needsScroll: boolean;
}
```

**Recommended: Compact text format** (for future update)
```
Visibility: <button data-testid="submit">

✓ visible, ✗ not in viewport (30% visible)
opacity: 1.0, display: block, visibility: visible

Issues:
  ✗ clipped by parent overflow:hidden
  ⚠ needs scroll to bring into view

→ Call playwright_scroll_to_element before clicking
```

**Token efficiency:** ~100 tokens vs ~180 tokens (current JSON) = **44% savings**

**Real-world debugging:**
- `✓ visible, ✗ not in viewport` → Element needs scroll
- `30% visible` → Only partially in viewport, might fail click
- `✗ clipped` → Parent has `overflow:hidden`
- `⚠ needs scroll` → Call `playwright_scroll_to_element` before interacting

**Why split:** Focused only on visibility. Provides actionable debugging info for the most common interaction failures.

---

### ✅ 4. `playwright_element_position` (SPLIT from get_element_state) - **IMPLEMENTED**
Get the position and size of an element.

**Implementation:** `src/tools/browser/elementInspection.ts`
**Tests:** `src/__tests__/tools/browser/elementInspection.test.ts`
**Status:** Fully implemented and tested (6 test cases passing)

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns (Current - JSON):**
```typescript
{
  x: number;
  y: number;
  width: number;
  height: number;
  inViewport: boolean;
}
```

**Recommended: Compact text format** (for future update)
```
Position: <button data-testid="submit">
@ (260,100) 120x40px, ✓ in viewport
```

**Token efficiency:** ~30 tokens vs ~100 tokens (current JSON) = **70% savings**

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

## Implementation Priority (Revised)

### ✅ Completed Tools
- **`playwright_inspect_dom`** - Progressive DOM discovery with semantic filtering ✅ **DONE**
- **`playwright_get_test_ids`** - Discover all test identifiers on the page ✅ **DONE**
- **`playwright_query_selector_all`** - Selector debugging and element inspection ✅ **DONE**
- **`playwright_element_visibility`** - Debug why clicks fail ✅ **DONE**
- **`playwright_element_position`** - Find where to click/interact ✅ **DONE**
- **Selector normalization** - Test ID shortcuts (testid:, data-test:, data-cy:) ✅ **DONE**

### Phase 1 - Critical Tools (Next to Implement)
1. **`playwright_list_iframes`** - Fills critical gap
2. **`playwright_element_exists`** - Most common check

### Phase 2 - High-Value Tools
4. **`playwright_list_network_requests`** - Common debugging need
5. **`playwright_get_request_details`** - Pair with list tool
6. **`playwright_wait_for_element`** - Better than sleep
7. **`playwright_element_interaction_state`** - Debug form issues

### Phase 3 - Quality of Life
8. **`playwright_get_cookies`** / **`playwright_set_cookie`** - Auth workflows
9. **`playwright_get_element_attributes`** - Deep inspection
10. **`playwright_wait_for_network_idle`** - Reliable waits
11. **`playwright_get_element_text`** - Focused extraction

### Phase 4 - Advanced Features
12. **`playwright_get_accessibility_snapshot`** - A11y testing
13. **`playwright_get_performance_timing`** - Performance analysis
14. **`playwright_get_local_storage`** / **`playwright_get_session_storage`**

**Total Recommended: 19 tools**
**Implemented: 5 tools** (playwright_inspect_dom, playwright_get_test_ids, playwright_query_selector_all, playwright_element_visibility, playwright_element_position)
**Remaining: 14 tools**

---

## Comparison: Original vs Revised

| Tool | Original Params | Revised Params | Change Reason |
|------|----------------|----------------|---------------|
| `get_element_state` | 1 | SPLIT into 4 tools | 10+ return fields → atomic tools |
| `get_network_activity` | 5 | SPLIT into 2 tools | Too many params → list/detail pattern |
| `set_cookies` | 1 (array) | 1 (single) | Array → single, call multiple times |
| `list_iframes` | 1 | 0 | Removed optional param for simplicity |
| `get_test_ids` | - | NEW | Enable test-driven workflows |
| `element_visibility` | - | Split from position | Tool name matches returns (no bounding box) |

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
