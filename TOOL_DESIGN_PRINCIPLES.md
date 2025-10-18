# Tool Design Principles for Playwright MCP Server

Based on research of LLM tool calling best practices (2024-2025), MCP specifications, and Anthropic/OpenAI guidelines.

## Core Principles

### 1. **Atomic Operations** ✅ CRITICAL
Each tool does ONE thing and does it well.

**Good Examples (Current):**
- `playwright_click` - only clicks
- `playwright_fill` - only fills
- `playwright_go_back` - only goes back

**Anti-Pattern to Avoid:**
```typescript
// BAD - multiple operations in one tool
playwright_navigate_and_click({ url, selector, waitForLoad })

// GOOD - separate concerns
playwright_navigate({ url })
playwright_click({ selector })
```

### 2. **Minimize Parameters** ✅ CRITICAL
Aim for 1-3 parameters. Max 5 parameters before considering splitting the tool.

**Guideline:**
- 1-2 parameters: Ideal
- 3-4 parameters: Acceptable
- 5+ parameters: Refactor into multiple tools

**Why:** More parameters = higher chance LLM provides wrong values or omits required ones.

### 3. **Primitive Types Over Objects** ✅ IMPORTANT
Use `string`, `number`, `boolean` instead of nested objects where possible.

**Good:**
```typescript
playwright_screenshot({
  selector: string;
  fullPage: boolean;
  path: string;
})
```

**Avoid:**
```typescript
playwright_screenshot({
  target: { selector: string; type: 'element' | 'page' };
  options: { fullPage: boolean; quality: number; };
  output: { path: string; format: 'png' | 'jpeg' };
})
```

### 4. **Flatten Return Structures** ⚠️ IMPORTANT
Return simple, flat objects. Avoid deep nesting.

**Better:**
```typescript
{
  exists: boolean;
  isVisible: boolean;
  isEnabled: boolean;
  hasClass: string;        // Space-separated classes
  elementId: string;
  boundingX: number;       // Flattened from boundingBox.x
  boundingY: number;
  boundingWidth: number;
  boundingHeight: number;
}
```

**Avoid:**
```typescript
{
  state: {
    visibility: { visible: boolean; inViewport: boolean; };
    interaction: { enabled: boolean; editable: boolean; };
    position: { boundingBox: { x, y, width, height }; };
  }
}
```

### 5. **Single Selector Parameter** ✅ CRITICAL
Don't add `testId`, `cssSelector`, `xpath` as separate parameters.

**Correct Approach:**
```typescript
{
  selector: string;  // CSS, text, or testid: prefix
}

// Usage:
{ selector: "#login" }              // CSS
{ selector: "text=Login" }          // Text
{ selector: "testid:submit-btn" }   // Test ID shorthand
```

**Wrong Approach:**
```typescript
{
  selector?: string;
  testId?: string;
  xpath?: string;
  // LLM must choose which parameter to use - adds complexity!
}
```

**Implementation:** Use internal normalization helper to convert shorthand to full selectors.

### 6. **Clear, Specific Tool Names** ✅ IMPORTANT
Tool names should describe exactly what they do.

**Good:**
- `playwright_click_and_switch_tab` - describes the complete action
- `playwright_save_as_pdf` - clear output format

**Avoid Ambiguity:**
- `playwright_interact` - too vague
- `playwright_process` - what does it process?

### 7. **Explicit Over Implicit** ✅ IMPORTANT
Make behavior explicit through parameters, not implicit through smart defaults.

**Good:**
```typescript
playwright_navigate({
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';  // Explicit
})
```

**Problematic:**
```typescript
playwright_navigate({
  url: string;
  // Implicitly waits for "smart" detection - LLM doesn't know what happens
})
```

### 8. **Error Returns, Not Exceptions** ✅ CRITICAL (MCP Spec)
Return errors as part of the result object so LLM can see and handle them.

**Correct (Current Implementation):**
```typescript
return {
  content: [{
    type: "text",
    text: "Error: Element not found"
  }],
  isError: true
};
```

**Wrong:**
```typescript
throw new Error("Element not found");  // LLM never sees this!
```

### 9. **Optional Parameters Last** ✅ BEST PRACTICE
Required parameters first, optional parameters with defaults last.

**Good:**
```typescript
{
  selector: string;           // Required
  timeout?: number;           // Optional
  waitForVisible?: boolean;   // Optional
}
```

### 10. **Consistent Naming Conventions** ✅ IMPORTANT
Use consistent patterns across tools.

**Current Conventions (Keep):**
- All tools: `playwright_*`
- Boolean parameters: `is*`, `should*`, `include*`
- Paths: always `*Path` not `*File` or `*Location`
- Timeouts: always `timeout` (milliseconds)

## Tool Design Checklist

Before adding a new tool, verify:

- [ ] Does ONE thing (atomic operation)
- [ ] Has 5 or fewer parameters
- [ ] Uses primitive types (string, number, boolean)
- [ ] Returns flat structure (minimal nesting)
- [ ] Has clear, specific name
- [ ] Single `selector` parameter (not multiple selector types)
- [ ] Optional parameters have sensible defaults
- [ ] Returns errors as `ToolResponse` with `isError: true`
- [ ] Name length: `playwright-mcp:tool_name` < 60 chars (some clients limit)

## Refactoring Recommendations

Based on these principles, here's how to improve the proposed tools:

### ❌ SPLIT: `playwright_get_element_state`
**Problem:** Returns complex nested object with 10+ fields

**Better Approach:**
```typescript
// Three focused tools instead of one complex tool

playwright_element_exists({ selector })
→ { exists: boolean; tagName: string; }

playwright_element_visibility({ selector })
→ { isVisible: boolean; isInViewport: boolean; opacity: number; }

playwright_element_attributes({ selector })
→ { attributes: Record<string, string>; }  // Flat key-value
```

### ❌ SIMPLIFY: `playwright_get_network_activity`
**Problem:** 6 parameters, complex filtering

**Better Approach:**
```typescript
// Simple list
playwright_list_network_requests({
  limit?: number;  // Default: 50
})
→ {
  requests: Array<{
    index: number;     // Use this to get details
    url: string;
    method: string;
    status: number;
    type: string;
  }>;
}

// Get details for specific request
playwright_get_request_details({
  index: number;     // From list above
})
→ {
  url, method, status, requestBody, responseBody, headers, timing
}
```

### ✅ KEEP: `playwright_query_selector_all`
**Why:** Already follows good practices
- 3 parameters
- Returns flat array
- Single purpose (test selectors)

### ✅ KEEP: `playwright_list_iframes`
**Why:**
- 1 optional parameter
- Returns flat list
- Atomic operation

## Selector Normalization Pattern

Implement this helper in `BrowserToolBase`:

```typescript
/**
 * Normalize selector shortcuts to full Playwright selectors
 * - "testid:foo" → "[data-testid='foo']"
 * - "data-test:bar" → "[data-test='bar']"
 * - "data-cy:baz" → "[data-cy='baz']"
 * - Everything else → pass through
 */
protected normalizeSelector(selector: string): string {
  const prefixMap: Record<string, string> = {
    'testid:': 'data-testid',
    'data-test:': 'data-test',
    'data-cy:': 'data-cy',
  };

  for (const [prefix, attr] of Object.entries(prefixMap)) {
    if (selector.startsWith(prefix)) {
      const value = selector.slice(prefix.length);
      return `[${attr}="${value}"]`;
    }
  }

  return selector;  // CSS, text=, etc. pass through
}
```

Apply in every tool:
```typescript
const normalizedSelector = this.normalizeSelector(args.selector);
await this.page.click(normalizedSelector);
```

## Return Structure Pattern

### Simple Success (Boolean Result)
```typescript
{
  content: [{
    type: "text",
    text: "true"
  }],
  isError: false
}
```

### Simple Success (Data Result)
```typescript
{
  content: [{
    type: "text",
    text: JSON.stringify({
      field1: "value1",
      field2: 123,
      field3: true
    }, null, 2)
  }],
  isError: false
}
```

### Error Result
```typescript
{
  content: [{
    type: "text",
    text: `Error: Element with selector "${selector}" not found\nTimeout: ${timeout}ms`
  }],
  isError: true
}
```

## Documentation Pattern

Each tool should document:

```typescript
{
  name: "playwright_tool_name",
  description: "One sentence describing what it does. Include key behavior (e.g., 'Waits up to 30s by default'). Example: Click button with selector '#submit'.",
  inputSchema: {
    type: "object",
    properties: {
      param1: {
        type: "string",
        description: "What this parameter does. Example: '#login-button' or 'testid:submit'"
      }
    },
    required: ["param1"]
  }
}
```

## Examples of Good vs Bad Design

### Example 1: Element Interaction

❌ **Too Complex**
```typescript
playwright_interact_with_element({
  selector: string;
  action: 'click' | 'fill' | 'select' | 'hover';
  value?: string;
  options?: { force?: boolean; timeout?: number; };
})
```

✅ **Atomic Tools**
```typescript
playwright_click({ selector, timeout? })
playwright_fill({ selector, value, timeout? })
playwright_select({ selector, value, timeout? })
playwright_hover({ selector, timeout? })
```

### Example 2: Information Retrieval

❌ **Nested Returns**
```typescript
playwright_get_page_info() → {
  navigation: { url, title },
  viewport: { width, height },
  performance: { loadTime, domReady },
  metadata: { description, keywords }
}
```

✅ **Focused Tools**
```typescript
playwright_get_url() → { url: string }
playwright_get_title() → { title: string }
playwright_get_viewport() → { width: number; height: number }
```

### Example 3: Waiting

❌ **Magic Behavior**
```typescript
playwright_smart_wait({
  condition: string;  // LLM must describe what to wait for
})
```

✅ **Explicit Tools**
```typescript
playwright_wait_for_element({ selector, state: 'visible' | 'hidden' })
playwright_wait_for_network_idle({ timeout })
playwright_wait_for_load({ waitUntil: 'load' | 'networkidle' })
```

## References

Based on research from:
- Anthropic Claude Tool Use Documentation (2024-2025)
- Model Context Protocol Specification (2025-06-18)
- OpenAI Function Calling Best Practices
- LangChain Tool Design Patterns
- Real-world LLM agent tool calling patterns

**Key Source**: "Fewer parameters are generally better, as complex parameter lists significantly increase the likelihood of accidental misplacements and mistakes."
