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

### 4. **Token-Efficient Response Format** ✅ CRITICAL
**Research shows**: JSON is ~2x more token-heavy than compact text formats. Anthropic's examples show concise text responses use ~⅓ tokens vs detailed JSON.

**Principle**: Return compact, human-readable text instead of verbose JSON when appropriate.

**Compact Text Format** (preferred for complex data):
```typescript
// Returns plain text string
return {
  content: [{
    type: "text",
    text: `Element State: <button data-testid="submit">
@ (260,100) 120x40px
✓ visible, ⚡ interactive
opacity: 1.0, display: block`
  }]
};
```
~75 tokens

**JSON Format** (use only when structure is critical):
```typescript
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      tagName: "button",
      testId: "submit",
      x: 260,
      y: 100,
      width: 120,
      height: 40,
      isVisible: true,
      isInteractive: true,
      opacity: 1.0,
      display: "block"
    }, null, 2)
  }]
};
```
~230 tokens (3x more!)

**Guidelines**:
- Use **compact text** for: DOM trees, element lists, layout info, debugging output
- Use **JSON** for: Structured data that code will parse, single objects with <5 fields
- Use **symbols** over words: ✓✗⚡→↓←↑ instead of `"isVisible": true`
- Use **shorthand notation**: `@ (x,y) WxH` instead of separate fields
- **Flatten nested data**: One level deep maximum in JSON

**Token Savings**:
- Compact text: 60-75% fewer tokens than JSON
- Symbols (✓): 1 token vs `"isVisible": true` (3+ tokens)
- Arrows (→10px): 2 tokens vs `"gapRight": 10` (4+ tokens)

### 4a. **Base64 Images in MCP Tool Responses** ⚠️ CRITICAL LIMITATION

**DO NOT return base64-encoded images in MCP tool responses.**

**Research Finding (2025-01-20):** Claude Code MCP implementation has a critical limitation with base64 images:

| Method | Token Cost | Works in Claude Code? |
|--------|-----------|----------------------|
| **User pastes image directly** | ~1,500 tokens | ✅ Yes (efficient) |
| **MCP tool returns base64** | ~137,411 tokens | ❌ No (exceeds 25k limit) |

**The Problem:**
- MCP tool responses have a 25,000 token limit (configurable via `MAX_MCP_OUTPUT_TOKENS`)
- Base64 screenshot data is ~137,411 tokens (raw string length)
- Claude Code counts the base64 STRING tokens, not efficient image tokens
- Result: **Tool response fails with error** (Issue #9152)

**Why the Discrepancy:**
When users paste images into Claude Code, the client converts them to efficient image format (~1,500 tokens). When MCP tools return base64, Claude Code treats it as TEXT and counts every character.

**Correct Approach for Screenshots:**
```typescript
// ✅ GOOD - Return file path
playwright_screenshot({ name: "login" })
→ "✓ Screenshot saved: .mcp-web-inspector/screenshots/login-2025-01-20.png"

// ❌ BAD - Don't return base64
playwright_screenshot({ name: "login", returnBase64: true })
→ { type: "image", data: "iVBORw0KG..." }  // FAILS: exceeds 25k tokens
```

**User Workflow:**
1. Tool saves screenshot to file
2. User opens file in IDE/Finder
3. If analysis needed, user manually pastes into Claude Code
4. Claude processes efficiently (~1,500 tokens)

**Alternative (MCP Resources):**
MCP Resources can contain base64 blobs, but Claude Desktop requires users to **explicitly select resources** before use - no better UX than file-based approach.

**Conclusion:** File paths are the ONLY working solution for binary data (screenshots, PDFs, etc.) in MCP tool responses.

**References:**
- GitHub Issue #9152: "Image responses token exceeds 25000 tokens"
- MCP Specification 2025-06-18
- Research: January 20, 2025

### 5. **Semantic Data Filtering** ✅ IMPORTANT
When returning hierarchical data (like DOM trees), filter out noise to reduce tokens.

**Problem**: Modern web apps have deeply nested wrapper divs (Material-UI, Tailwind, etc.)
```html
<div class="MuiContainer-root">
  <div class="MuiBox-root css-xyz123">
    <div class="flex-wrapper">
      <div class="content-container">
        <form> <!-- 5 levels deep! -->
```

**Solution**: Return only semantic elements, skip wrappers
```typescript
// Skip generic wrappers, return only:
// - Semantic HTML (header, form, button, input, h1-h6, nav, main, etc.)
// - Elements with test IDs (data-testid, data-test, data-cy)
// - Interactive elements (onclick, links, form controls)
// - Elements with ARIA roles (role="button", role="dialog", etc.)
// - Containers with significant text (>10 chars direct text)

// Result: 3 semantic levels instead of 9 DOM levels
<body>
└── <main>
    └── <form data-testid="login-form">
        └── <input data-testid="email-input" />
```

**Depth Strategy**: Always return depth=1 (immediate children only)
- ✅ **Good**: Each tool call shows one level, LLM calls again to drill deeper
- ❌ **Bad**: Return nested tree with depth=3, output becomes unreadable

**Example Progressive Workflow**:
```
Call 1: inspect_dom({}) → See <header>, <main>, <footer>
Call 2: inspect_dom({ selector: "main" }) → See <aside>, <form>
Call 3: inspect_dom({ selector: "form" }) → See <input>, <button>
```

**Benefits**:
- Reduces output from 500+ tokens to <100 tokens per call
- LLM sees structure without noise
- Faster comprehension and decision-making
- Readable output even for deeply nested structures

**Handling Poorly Structured DOM**:

When semantic filtering returns no/few elements, provide actionable guidance:

```typescript
// Bad: Silent failure
return { children: [] };

// Good: Explain and suggest alternatives
return `
Children (0 semantic, skipped 12 wrapper divs):

⚠ No semantic elements found at this level.

Suggestions:
1. Use playwright_get_visible_html to see raw HTML
2. Look for elements by class/id if test IDs unavailable
3. Recommend adding data-testid for better testability

Wrapper divs: <div class="wrapper">, <div class="content">, ...

To improve structure, consider adding:
  - Semantic HTML: <header>, <main>, <button>
  - Test IDs: data-testid="submit"
  - ARIA roles: role="button"
`;
```

This guides LLMs to:
- Switch to alternative inspection tools
- Work with available CSS selectors
- Understand why inspection failed
- Suggest improvements to developers

### 6. **Single Selector Parameter** ✅ CRITICAL
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

### 7. **Clear, Specific Tool Names** ✅ IMPORTANT
Tool names should describe exactly what they do.

**Good:**
- `playwright_click_and_switch_tab` - describes the complete action
- `playwright_save_as_pdf` - clear output format

**Avoid Ambiguity:**
- `playwright_interact` - too vague
- `playwright_process` - what does it process?

### 8. **Explicit Over Implicit** ✅ IMPORTANT
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

### 9. **Error Returns, Not Exceptions** ✅ CRITICAL (MCP Spec)
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

### 10. **Optional Parameters Last** ✅ BEST PRACTICE
Required parameters first, optional parameters with defaults last.

**Good:**
```typescript
{
  selector: string;           // Required
  timeout?: number;           // Optional
  waitForVisible?: boolean;   // Optional
}
```

### 11. **Actionable Error Messages & Guidance** ✅ IMPORTANT
When tools detect issues, provide **step-by-step guidance** for LLMs to fix them.

**Excellent Example (playwright_get_test_ids):**
When duplicate test IDs are detected, the tool provides:
1. Impact explanation (why it's a problem)
2. Step-by-step fix instructions
3. Concrete examples with actual duplicate values
4. Suggestions to use other MCP tools for investigation

```typescript
// When duplicates found, response includes:
🔧 How to Fix:
   1. Use playwright_query_selector_all to locate all duplicates
      playwright_query_selector_all({ selector: "testid:main-header" })
   2. Identify which elements should keep the test ID
   3. Rename duplicates to be unique and descriptive
      Example: "main-header" → "main-header-primary", "main-header-mobile"
   4. If one is hidden/unused, consider removing it entirely
```

**Why this works:**
- ✅ LLMs can autonomously fix the issue without asking user
- ✅ Provides concrete tool calls to run next
- ✅ Gives specific examples using actual detected values
- ✅ Chains tools together (get_test_ids → query_selector_all → fix code)

**Apply this pattern to:**
- Validation failures (suggest how to fix)
- Missing elements (suggest alternative selectors)
- Timeout errors (suggest increasing timeout or checking visibility)
- Permission errors (suggest required configuration)

### 12. **Consistent Naming Conventions** ✅ IMPORTANT
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
- [ ] Returns token-efficient format (compact text preferred over JSON)
- [ ] Uses symbols and shorthand (✓✗⚡→↓ vs verbose field names)
- [ ] Filters semantic data (skips wrapper divs, shows only meaningful elements)
- [ ] **Does NOT return base64 images** (use file paths instead - see 4a)
- [ ] **Provides actionable guidance** when issues detected (see 11)
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

### Compact Text Result (Preferred for Complex Data)
**Use this for**: DOM trees, element lists, layout info, debugging output

```typescript
{
  content: [{
    type: "text",
    text: `DOM Inspection: <form data-testid="login-form">
@ (260,100) 400x300px

Children (3 of 3):

[0] <input data-testid="email"> | textbox
    @ (260,150) 400x40px | gap: ↓10px
    ✓ visible, ⚡ interactive

[1] <input data-testid="password"> | textbox
    @ (260,200) 400x40px | gap: ↓10px
    ✓ visible, ⚡ interactive

[2] <button data-testid="submit"> | button
    @ (260,250) 120x40px | gap: ↓10px
    "Sign In"
    ✓ visible, ⚡ interactive

Layout: vertical`
  }],
  isError: false
}
```
**Token count**: ~150 tokens vs ~500+ for equivalent JSON

### JSON Result (Only for Simple Structured Data)
**Use this for**: Single objects with <5 fields, data that code will parse

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
- **Anthropic Claude Tool Use Documentation (2024-2025)**
  - Token-efficient tool use: Up to 70% reduction in output tokens
  - Concise text responses use ~⅓ tokens vs detailed JSON responses
  - [Writing effective tools for AI agents](https://www.anthropic.com/engineering/writing-tools-for-agents)

- **Model Context Protocol Specification (2025-06-18)**
  - JSON-RPC 2.0 transport over stdio/HTTP
  - Tool response format patterns

- **LLM Output Format Research (2024-2025)**
  - "JSON costs 2x more tokens than TSV for equivalent data" - Medium, 2024
  - "Compact formats reduce token usage by 60-75%" - Various sources
  - Tool calling is more token-efficient than JSON mode for structured output

- **OpenAI Function Calling Best Practices**
  - Fewer parameters reduce accidental misplacements and mistakes
  - Primitive types preferred over nested objects

- **LangChain Tool Design Patterns**
  - Atomic operations principle
  - Single-purpose tools vs multi-function tools

- **Real-world LLM Agent Tool Calling Patterns**
  - Flat structures parse faster and more reliably
  - Symbols (✓✗⚡) more token-efficient than verbose booleans

## Universal Applicability

**Important**: These principles apply to ALL LLM interactions, not just MCP tools:
- ✅ **Tool responses** (MCP, OpenAI function calling, etc.)
- ✅ **Prompt engineering** (system prompts, user messages)
- ✅ **Context windows** (documentation, code snippets)
- ✅ **Chain-of-thought outputs** (reasoning steps, debug info)
- ✅ **Multi-turn conversations** (chat history, state management)

The goal is always the same: **Maximize information density, minimize token waste.**
