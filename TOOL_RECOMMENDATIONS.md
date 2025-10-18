# Playwright MCP Server - Tool Recommendations (Revised)

**IMPORTANT:** This document has been revised based on LLM tool calling best practices research (2024-2025). See `TOOL_DESIGN_PRINCIPLES.md` for detailed design rationale.

## 🎉 Implementation Status

**Completed:** 2 tools + selector normalization helper
**Total Remaining:** 17 tools

### ✅ Recently Implemented
- `playwright_element_visibility` - Comprehensive visibility diagnostics
- `playwright_element_position` - Element coordinates and dimensions
- `BrowserToolBase.normalizeSelector()` - Test ID shorthand support

See `IMPLEMENTATION_SUMMARY.md` for implementation details.

---

## Key Design Changes from Original Recommendations

1. **Split complex tools** - Tools with 5+ parameters or nested returns split into focused tools
2. **Flatten return structures** - Minimize nesting, prefer flat key-value pairs
3. **Single selector parameter** - Use string normalization instead of multiple selector types
4. **Primitive types** - Avoid nested objects in parameters where possible

---

## Priority Levels
- 🔴 **High Priority** - Addresses critical gaps or frequently needed functionality
- 🟡 **Medium Priority** - Valuable quality-of-life improvements
- 🟢 **Low Priority** - Nice-to-have enhancements

---

## Test ID Discovery Tool

### 🔴 NEW: `playwright_get_test_ids`
Discover all test identifiers on the page (data-testid, data-test, data-cy, etc.).

**Parameters:**
```typescript
{
  attributes?: string[];   // Default: ['data-testid', 'data-test', 'data-cy']
}
```

**Returns:**
```typescript
{
  testIds: string[];       // Flat array of all test ID values found
  byAttribute: {           // Grouped by attribute name
    'data-testid': string[];
    'data-test': string[];
    'data-cy': string[];
  };
  total: number;
}
```

**Why this tool:** Makes test-driven workflows easier. No complex nested objects, simple discovery.

---

## Content Analysis & Debugging Tools

### 🔴 1. `playwright_query_selector_all`
Test a selector and return information about all matched elements.

**Parameters:**
```typescript
{
  selector: string;        // CSS, text, or testid:value shorthand
  limit?: number;          // Max elements to return (default: 10)
}
```

**Returns:**
```typescript
{
  count: number;
  elements: Array<{
    index: number;         // Use with other tools to target specific element
    tagName: string;
    textContent: string;   // First 100 chars
    id: string;
    className: string;     // Space-separated classes
    dataTestId: string;    // data-testid attribute if present
    isVisible: boolean;
    // Flattened bounding box (not nested object)
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  limitReached: boolean;
}
```

**Design note:** ✅ Follows best practices - 2 parameters, flat return structure, primitive types.

---

### ⚠️ 2. `playwright_element_exists` (SPLIT from get_element_state)
Check if element exists and get basic info.

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns:**
```typescript
{
  exists: boolean;
  tagName: string;         // Empty string if not exists
  id: string;
  className: string;
}
```

**Why split:** Original `get_element_state` had 10+ return fields. This focuses on existence check.

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

**Returns:**
```typescript
{
  // Playwright checks
  isVisible: boolean;          // Has bounding box, not display:none or visibility:hidden
  isInViewport: boolean;       // Actually intersects viewport (uses IntersectionObserver)
  viewportRatio: number;       // 0.0-1.0: How much is in viewport (0 = none, 1 = fully)

  // CSS properties
  opacity: number;             // 0.0 to 1.0
  display: string;             // CSS display value
  visibility: string;          // CSS visibility value

  // Common failure reasons
  isClipped: boolean;          // Cut off by overflow:hidden on parent
  isCovered: boolean;          // Another element is on top (if detectable)
  needsScroll: boolean;        // Element exists but needs scrollIntoView
}
```

**Real-world debugging:**
- `isVisible=true` but `isInViewport=false` → Element needs scroll
- `isVisible=true` but `viewportRatio=0.3` → Only 30% visible, might fail click
- `isClipped=true` → Parent has `overflow:hidden`
- `needsScroll=true` → Call `playwright_scroll_to_element` before interacting

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

**Returns:**
```typescript
{
  x: number;               // Distance from left edge of viewport
  y: number;               // Distance from top edge of viewport
  width: number;
  height: number;
  inViewport: boolean;     // Element is within visible viewport bounds
}
```

**Why split:** Focused only on layout/position. Separate from visibility concerns.

---

### ⚠️ 5. `playwright_element_interaction_state` (SPLIT from get_element_state)
Check if element can be interacted with.

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns:**
```typescript
{
  isEnabled: boolean;
  isEditable: boolean;
  isChecked: boolean | null;    // null if not checkbox/radio
  isFocused: boolean;
  isDisabled: boolean;
  readOnly: boolean;
  ariaDisabled: boolean;
}
```

**Why split:** Focused on interaction capability. LLM can call specific tool for specific concern.

---

### 🔴 6. `playwright_list_iframes`
List all iframes on the page.

**Parameters:**
```typescript
{
  // No parameters - keep it simple
}
```

**Returns:**
```typescript
{
  iframes: Array<{
    index: number;         // Use with iframe tools
    name: string;
    src: string;
    id: string;
    title: string;
    selector: string;      // CSS selector to locate iframe
    // Flattened position
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  total: number;
}
```

**Design note:** ✅ Removed nested iframe parameter - simpler is better. Flat return structure.

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

**Returns:**
```typescript
{
  tagName: string;
  allAttributes: Record<string, string>;  // Flat key-value
  dataAttributes: Record<string, string>; // Subset: data-* only
  ariaAttributes: Record<string, string>; // Subset: aria-* only
}
```

**Design note:** ✅ String filter instead of string array for simplicity.

---

### 🟡 8. `playwright_get_accessibility_snapshot`
Get accessibility information for an element.

**Parameters:**
```typescript
{
  selector?: string;       // Default: whole page
}
```

**Returns:**
```typescript
{
  role: string;
  name: string;            // Accessible name
  value: string;
  description: string;
  disabled: boolean;
  focused: boolean;
  level: number;           // For headings, tree items
  // Children omitted - too complex for single tool call
  // LLM can call recursively on child selectors if needed
}
```

**Design note:** ⚠️ Removed recursive tree structure. Return single level only. LLM can traverse manually.

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

**Returns:**
```typescript
{
  requests: Array<{
    index: number;         // Use with get_request_details
    url: string;
    method: string;
    status: number;
    type: string;
    fromCache: boolean;
    durationMs: number;
  }>;
  total: number;
  limitReached: boolean;
}
```

**Why split:** Original had 6 parameters. This simple list + detail pattern is more LLM-friendly.

---

### ⚠️ 10. `playwright_get_request_details` (SPLIT from get_network_activity)
Get detailed information about a specific network request.

**Parameters:**
```typescript
{
  index: number;           // From list_network_requests
}
```

**Returns:**
```typescript
{
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestBody: string;     // Truncated if large
  responseBody: string;    // Truncated if large
  requestHeaders: string;  // JSON string (flattened)
  responseHeaders: string; // JSON string (flattened)
  startTime: number;       // Unix timestamp ms
  endTime: number;
  durationMs: number;
  requestBytes: number;
  responseBytes: number;
}
```

**Why split:** Two-step list→detail pattern. Avoids complex filtering parameters.

---

### 🟡 11. `playwright_wait_for_network_idle`
Wait for network activity to settle.

**Parameters:**
```typescript
{
  timeout?: number;        // Default: 30000
}
```

**Returns:**
```typescript
{
  success: boolean;
  waitedMs: number;
  pendingRequests: number;
}
```

**Design note:** ✅ Simplified - removed idleDuration and maxInflight. Use sensible defaults.

---

### 🟢 12. `playwright_get_performance_timing`
Get page load performance timing.

**Parameters:**
```typescript
{} // No parameters
```

**Returns:**
```typescript
{
  domContentLoadedMs: number;
  loadEventMs: number;
  firstPaintMs: number;
  firstContentfulPaintMs: number;
  // All values relative to navigation start
}
```

**Design note:** ✅ Flat structure, removed nested timing/memory/metrics objects.

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

**Returns:**
```typescript
{
  success: boolean;
  waitedMs: number;
  finallyVisible: boolean;
  finallyExists: boolean;
}
```

**Design note:** ✅ Good design - 3 parameters, flat return, clear purpose.

---

### 🟡 14. `playwright_get_cookies`
Get cookies for current page.

**Parameters:**
```typescript
{
  names?: string;          // Comma-separated cookie names (optional filter)
}
```

**Returns:**
```typescript
{
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;       // Unix timestamp, -1 for session
    httpOnly: boolean;
    secure: boolean;
    sameSite: string;
  }>;
  total: number;
}
```

**Design note:** ✅ Simplified URLs array to single context.

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

**Returns:**
```typescript
{
  success: boolean;
}
```

**Design note:** ✅ Single cookie instead of array. LLM calls multiple times for multiple cookies.

---

### 🟢 16. `playwright_get_local_storage`
Get localStorage contents.

**Parameters:**
```typescript
{
  keys?: string;           // Comma-separated keys (optional)
}
```

**Returns:**
```typescript
{
  items: Record<string, string>;
  total: number;
}
```

**Design note:** ✅ Simple, flat structure.

---

### 🟢 17. `playwright_get_session_storage`
Get sessionStorage contents.

**Parameters:**
```typescript
{
  keys?: string;           // Comma-separated keys (optional)
}
```

**Returns:**
```typescript
{
  items: Record<string, string>;
  total: number;
}
```

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

**Returns:**
```typescript
{
  text: string;
  length: number;
}
```

**Design note:** ✅ Removed innerText parameter - use sensible default. Simpler.

---

### 🟡 19. `playwright_scroll_to_element`
Scroll an element into view. **Complements `playwright_element_visibility`.**

**Parameters:**
```typescript
{
  selector: string;
}
```

**Returns:**
```typescript
{
  scrolled: boolean;           // Whether scrolling was needed
  nowInViewport: boolean;      // Element in viewport after scroll
  viewportRatio: number;       // How much is visible (0.0-1.0)
}
```

**Use case:** When `playwright_element_visibility` returns `needsScroll=true`, call this before clicking/interacting.

**Design note:** ✅ Wraps Playwright's `scrollIntoViewIfNeeded()`. Simple, focused operation.

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
- **`playwright_element_visibility`** - Debug why clicks fail ✅ **DONE**
- **`playwright_element_position`** - Find where to click/interact ✅ **DONE**
- **Selector normalization** - Test ID shortcuts (testid:, data-test:, data-cy:) ✅ **DONE**

### Phase 1 - Critical Tools (Next to Implement)
1. **`playwright_get_test_ids`** - Enable test-driven workflows
2. **`playwright_query_selector_all`** - Essential for selector debugging
3. **`playwright_list_iframes`** - Fills critical gap
4. **`playwright_element_exists`** - Most common check

### Phase 2 - High-Value Tools
7. **`playwright_list_network_requests`** - Common debugging need
8. **`playwright_get_request_details`** - Pair with list tool
9. **`playwright_wait_for_element`** - Better than sleep
10. **`playwright_element_interaction_state`** - Debug form issues

### Phase 3 - Quality of Life
11. **`playwright_get_cookies`** / **`playwright_set_cookie`** - Auth workflows
12. **`playwright_get_element_attributes`** - Deep inspection
13. **`playwright_wait_for_network_idle`** - Reliable waits
14. **`playwright_get_element_text`** - Focused extraction

### Phase 4 - Advanced Features
15. **`playwright_get_accessibility_snapshot`** - A11y testing
16. **`playwright_get_performance_timing`** - Performance analysis
17. **`playwright_get_local_storage`** / **`playwright_get_session_storage`**

**Total: 19 new tools** (20 including the test ID discovery tool and scroll helper)

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
✅ **Flat returns** - Minimal nesting in response objects
✅ **Single selector param** - String normalization handles multiple formats
✅ **Clear naming** - Tool names describe exact behavior
✅ **Error as results** - Errors returned in ToolResponse, not thrown

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
