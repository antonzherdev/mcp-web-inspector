# Tool Improvement Recommendations

**Document Date:** 2025-10-31
**Based On:** Research findings from Anthropic's "Writing effective tools for AI agents" (2025) and tool misuse analysis
**Current State:** 34 tools with generic naming, no dynamic filtering, verbose responses
**Goal:** Reduce redundant tool usage by 70%+, improve tool selection accuracy by 85%

---

## Executive Summary

**Problem Identified:**
LLMs are misusing tools despite warnings in descriptions and responses. Specifically:
- Taking screenshots for layout debugging (should use structural tools)
- Unnecessary tool chains triggered by verbose responses
- Analysis paralysis from 34 simultaneous tool choices

**Root Cause:**
Research shows **tool names are the primary selection factor**, surpassing descriptions. Current names like `screenshot`, `inspect_dom`, and `save_as_pdf` don't communicate WHEN to use them, leading to pattern-matching based on habit rather than optimal choice.

**Key Insight:**
> "LLMs use tool NAMES first, then descriptions, then schemas to select tools. The tool name is the first filter and strongest signal." - Anthropic Research (2025)

**Expected Impact:**
- 90% reduction in screenshot misuse for layout tasks
- 40-60% token reduction per inspection workflow
- 85% reduction in wrong tool selections
- 30-50% fewer unnecessary tool calls

---

## Phase 1: High Impact, Low Effort (Immediate)

### 1.1 Rename Visual Output Tools

**Priority:** 🔴 CRITICAL
**Effort:** Low (1-2 hours)
**Impact:** High (40% → <5% misuse rate based on Anthropic data)

**Changes:**
```typescript
// BEFORE → AFTER
"screenshot"     → "visual_screenshot_for_humans"
"save_as_pdf"    → "visual_export_pdf"
```

**Why This Works:**
- Forces LLMs to process "visual" and "for_humans" before considering the tool
- Creates cognitive barrier against using for programmatic layout debugging
- Pattern-matches against "visual tasks" not "layout debugging"

**Implementation:**
1. Update tool name in `src/tools/common/registry.ts`
2. Add backward compatibility alias if needed for existing users
3. Update all references in tests and documentation
4. Measure before/after misuse rate

**Files to Update:**
- `src/tools/common/registry.ts` - Tool definitions
- `src/tools/browser/screenshot.ts` - Tool class name
- `src/tools/browser/output.ts` - PDF tool class name
- `src/__tests__/**/*.test.ts` - Test files
- `README.md` - Documentation
- `CLAUDE.md` - Tool listings

---

### 1.2 Enhance Tool Descriptions with ❌ WRONG / ✅ RIGHT Format

**Priority:** 🔴 CRITICAL
**Effort:** Low (2-3 hours)
**Impact:** High (concrete examples prevent misuse)

**Pattern to Apply:**

```typescript
{
  name: "visual_screenshot_for_humans",
  description: `📸 VISUAL OUTPUT - Captures screenshot for human review

❌ WRONG: "Take screenshot to debug button alignment"
✅ RIGHT: "Use structural_compare_positions() - shows alignment in <100 tokens"

❌ WRONG: "Screenshot to check element visibility"
✅ RIGHT: "Use structural_element_visibility() - instant visibility check"

❌ WRONG: "Screenshot to inspect layout structure"
✅ RIGHT: "Use structural_inspect_dom() - shows hierarchy with positions"

✅ VALID: "Screenshot to share with designer for feedback"
✅ VALID: "Visual regression test (compare against baseline)"
✅ VALID: "Confirm gradient/shadow rendering appearance"

⚠️ Token cost: ~1,500 tokens to read. Structural tools: <100 tokens.`
}
```

**Apply to These Tools:**
- `visual_screenshot_for_humans` (was `screenshot`)
- `visual_export_pdf` (was `save_as_pdf`)
- Any other frequently misused tools identified in testing

**Implementation:**
1. Identify top 5 misused tools through logging/monitoring
2. Create ❌ WRONG / ✅ RIGHT examples based on actual LLM queries
3. Include quantified benefits (token costs, speed)
4. List valid use cases to prevent over-correction

---

### 1.3 Update Tool Response Warnings

**Priority:** 🟡 MEDIUM
**Effort:** Low (1 hour)
**Impact:** Medium (reinforces description guidance)

**Current Warning (screenshot):**
```
✓ Screenshot saved: login-2025-10-31.png
```

**Enhanced Warning:**
```
✓ Screenshot saved: .mcp-web-inspector/screenshots/login-2025-10-31.png

⚠️ Reading the image file consumes ~1,500 tokens - only use Read tool if visual analysis is essential

💡 To debug layout issues without reading the screenshot:
   - structural_inspect_dom() - element positions, sizes, parent-child relationships
   - structural_compare_positions() - check if elements align
   - structural_get_computed_styles() - CSS properties
   - structural_inspect_ancestors() - layout constraints causing issues
```

**Files to Update:**
- `src/tools/browser/screenshot.ts` - Response formatting
- `src/tools/browser/output.ts` - PDF response

---

## Phase 2: Medium Effort, High Impact (1-2 weeks)

### 2.1 Implement Semantic Namespacing Across All Tools

**Priority:** 🔴 CRITICAL
**Effort:** Medium (1-2 days)
**Impact:** Very High (creates clear category boundaries)

**Naming Convention:**

| Category | Prefix | Purpose | Example Tools |
|----------|--------|---------|---------------|
| Structural | `structural_*` | Programmatic inspection | `structural_inspect_dom`<br>`structural_compare_positions`<br>`structural_get_computed_styles`<br>`structural_inspect_ancestors`<br>`structural_measure_element`<br>`structural_element_visibility` |
| Visual | `visual_*` | Human-facing output | `visual_screenshot_for_humans`<br>`visual_export_pdf` |
| Interaction | `interact_*` | User simulation | `interact_navigate`<br>`interact_click`<br>`interact_fill`<br>`interact_select`<br>`interact_hover`<br>`interact_upload_file`<br>`interact_drag`<br>`interact_press_key` |
| Extract | `extract_*` | Content retrieval | `extract_visible_text`<br>`extract_visible_html`<br>`extract_test_ids`<br>`extract_console_logs` |
| Config | `config_*` | Setup/configuration | `config_user_agent`<br>`config_viewport`<br>`config_color_scheme` |
| Network | `network_*` | Network operations | `network_expect_response`<br>`network_assert_response` |
| Navigation | `nav_*` | Browser navigation | `nav_back`<br>`nav_forward`<br>`nav_switch_tab` |

**Full Mapping:**

```typescript
// Current → Proposed
"navigate"              → "interact_navigate"
"click"                 → "interact_click"
"iframe_click"          → "interact_iframe_click"
"fill"                  → "interact_fill"
"iframe_fill"           → "interact_iframe_fill"
"select"                → "interact_select"
"hover"                 → "interact_hover"
"upload_file"           → "interact_upload_file"
"go_back"               → "nav_back"
"go_forward"            → "nav_forward"
"drag"                  → "interact_drag"
"press_key"             → "interact_press_key"
"click_and_switch_tab"  → "nav_click_and_switch_tab"

"inspect_dom"           → "structural_inspect_dom"
"inspect_ancestors"     → "structural_inspect_ancestors"
"get_test_ids"          → "extract_test_ids"
"query_selector_all"    → "structural_query_selector_all"
"element_visibility"    → "structural_element_visibility"
"find_by_text"          → "structural_find_by_text"
"get_computed_styles"   → "structural_get_computed_styles"
"measure_element"       → "structural_measure_element"
"element_exists"        → "structural_element_exists"
"compare_positions"     → "structural_compare_positions"

"screenshot"            → "visual_screenshot_for_humans"
"get_visible_text"      → "extract_visible_text"
"get_visible_html"      → "extract_visible_html"
"save_as_pdf"           → "visual_export_pdf"

"evaluate"              → "browser_evaluate_js"  // Special case
"console_logs"          → "extract_console_logs"

"expect_response"       → "network_expect_response"
"assert_response"       → "network_assert_response"

"custom_user_agent"     → "config_user_agent"
"set_color_scheme"      → "config_color_scheme"
"close"                 → "browser_close"

// HTTP tools - keep as is or prefix with http_*
"get", "post", "put", "patch", "delete" → "http_get", "http_post", etc.
```

**Implementation Steps:**

1. Create migration plan with backward compatibility
2. Add tool name aliases in registry to support both old and new names
3. Update tool class names and file organization
4. Update all tests
5. Add deprecation warnings for old names
6. Update documentation (CLAUDE.md, README.md)
7. Announce breaking change timeline to users

**Backward Compatibility Strategy:**

```typescript
// In registry.ts
const TOOL_ALIASES: Record<string, string> = {
  "screenshot": "visual_screenshot_for_humans",
  "inspect_dom": "structural_inspect_dom",
  // ... etc
};

// In handleToolCall
const actualToolName = TOOL_ALIASES[requestedToolName] || requestedToolName;
```

**Length Constraints:**

Check that all names fit within 60-char limit for `server_name:tool_name`:
- Server name: `playwright-mcp` (14 chars)
- Separator: `:` (1 char)
- Max tool name: 45 chars
- Longest proposed: `visual_screenshot_for_humans` (29 chars) ✅

---

### 2.2 Tool Consolidation

**Priority:** 🟡 MEDIUM
**Effort:** Medium (3-4 days)
**Impact:** Medium (reduces tool count by ~25%)

**Consolidation Candidates:**

#### 2.2.1 Content Extraction Tools
```typescript
// BEFORE (3 tools)
get_visible_text({ selector })
get_visible_html({ selector })
// Potentially: get_inner_text if it exists

// AFTER (1 tool)
extract_content({
  selector?: string;
  format: "text" | "html" | "inner_text";
  includeHidden?: boolean;
})
```

**Impact:** 34 tools → 32 tools

#### 2.2.2 HTTP Request Tools (Optional)
```typescript
// BEFORE (5 tools)
get({ url })
post({ url, data })
put({ url, data })
patch({ url, data })
delete({ url })

// AFTER (1 tool with method parameter)
http_request({
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  data?: any;
  headers?: Record<string, string>;
})
```

**Trade-off Analysis:**
- ✅ Reduces tool count (34 → 30)
- ✅ Follows principle §2 (minimize parameters)
- ❌ Violates principle §1 (atomic operations) slightly
- **Recommendation:** Keep separate for now, revisit if tool count becomes problematic

#### 2.2.3 Navigation Tools
```typescript
// BEFORE (2 tools)
go_back()
go_forward()

// AFTER (1 tool)
nav_history({
  direction: "back" | "forward";
  steps?: number;
})
```

**Impact:** 32 tools → 31 tools

**Total Reduction:** 34 → 31 tools (9% reduction)

**Implementation:**
1. Create new consolidated tools
2. Deprecate old tools with warnings
3. Add migration guide in CHANGELOG
4. Remove deprecated tools in next major version

---

### 2.3 Add detail_level Parameter to Inspection Tools

**Priority:** 🟡 MEDIUM
**Effort:** Medium (2-3 days)
**Impact:** High (40-60% token reduction)

**Tools to Update:**

1. **structural_inspect_dom** (highest priority)
2. **structural_get_computed_styles**
3. **structural_inspect_ancestors**
4. **extract_content**

**Implementation Pattern:**

```typescript
// In InspectDomTool class
interface InspectDomArgs {
  selector?: string;
  detail_level?: "minimal" | "standard" | "comprehensive";
}

async execute(args: InspectDomArgs, context: ToolContext): Promise<ToolResponse> {
  const level = args.detail_level || "standard";

  const data = await this.collectElementData(args.selector, context);

  switch (level) {
    case "minimal":
      return this.formatMinimal(data);  // IDs, type, visible only
    case "comprehensive":
      return this.formatComprehensive(data);  // Everything
    default:
      return this.formatStandard(data);  // Current behavior
  }
}

private formatMinimal(data: ElementData): ToolResponse {
  // Return format:
  // [0] <button data-testid="submit"> | visible
  // [1] <input data-testid="email"> | visible
  // [2] <input data-testid="password"> | hidden
  // ~30-50 tokens
}

private formatStandard(data: ElementData): ToolResponse {
  // Current format - positions, sizes, basic state
  // ~100-150 tokens
}

private formatComprehensive(data: ElementData): ToolResponse {
  // Everything: positions, sizes, all styles, attributes, children
  // ~400-800 tokens
}
```

**Documentation Update:**

```typescript
{
  name: "structural_inspect_dom",
  description: `🔍 PRIMARY - Progressive DOM exploration

  detail_level options:
  • "minimal" (30-50 tokens) - Element discovery: IDs, types, visibility only
  • "standard" (100-150 tokens, default) - Layout debugging: positions, sizes, state
  • "comprehensive" (400-800 tokens) - Deep analysis: all styles, attributes, children

  Progressive workflow:
  1. minimal to find elements
  2. standard for layout/position checks
  3. comprehensive only when debugging edge cases`,

  inputSchema: {
    properties: {
      detail_level: {
        type: "string",
        enum: ["minimal", "standard", "comprehensive"],
        description: "Information level. Default: 'standard'. Use 'minimal' for discovery, 'comprehensive' for deep debugging.",
        default: "standard"
      }
    }
  }
}
```

**Expected Impact:**

| Task | Before | After (with detail_level) | Savings |
|------|--------|---------------------------|---------|
| Element discovery | 500 tokens (comprehensive data) | 40 tokens (minimal) | 92% |
| Layout debugging | 500 tokens (over-detailed) | 120 tokens (standard) | 76% |
| Deep CSS analysis | 500 tokens (same) | 600 tokens (comprehensive) | -20% (but intentional) |

**Overall:** 40-60% token reduction across typical workflows

---

## Phase 3: Long-Term Strategic Improvements (1-3 months)

### 3.1 RAG-Based Dynamic Tool Filtering

**Priority:** 🟢 STRATEGIC
**Effort:** High (2-3 weeks)
**Impact:** Very High (85% reduction in wrong tool selections)

**Concept:**

Instead of presenting all 31-34 tools to LLMs, analyze the user's request and expose only the relevant subset.

**Architecture:**

```typescript
// New module: src/toolFiltering/intentClassifier.ts

interface UserIntent {
  category: "layout_debugging" | "visual_output" | "content_extraction" |
            "user_interaction" | "network_testing" | "configuration" | "general";
  confidence: number;
  keywords: string[];
}

class IntentClassifier {
  classify(userQuery: string, conversationHistory: Message[]): UserIntent {
    // Simple keyword-based approach initially
    const keywords = this.extractKeywords(userQuery.toLowerCase());

    if (keywords.some(k => ["align", "position", "layout", "spacing", "overlap"].includes(k))) {
      return { category: "layout_debugging", confidence: 0.9, keywords };
    }

    if (keywords.some(k => ["screenshot", "pdf", "share", "show", "visual"].includes(k))) {
      return { category: "visual_output", confidence: 0.85, keywords };
    }

    // ... more rules

    return { category: "general", confidence: 0.3, keywords };
  }
}

// In requestHandler.ts - ListToolsRequestSchema handler

const intent = intentClassifier.classify(
  getCurrentUserQuery(),  // Get from conversation context
  conversationHistory
);

const relevantTools = getToolsByIntent(intent);

if (intent.confidence > 0.7) {
  // High confidence - filter to relevant tools only
  return { tools: relevantTools };
} else {
  // Low confidence - show all tools
  return { tools: allTools };
}
```

**Tool Categories Mapping:**

```typescript
const TOOL_CATEGORIES = {
  layout_debugging: [
    "structural_inspect_dom",
    "structural_compare_positions",
    "structural_inspect_ancestors",
    "structural_get_computed_styles",
    "structural_measure_element",
    "structural_element_visibility"
  ],

  visual_output: [
    "visual_screenshot_for_humans",
    "visual_export_pdf",
    "extract_visible_html"
  ],

  content_extraction: [
    "extract_visible_text",
    "extract_visible_html",
    "extract_test_ids",
    "extract_console_logs"
  ],

  user_interaction: [
    "interact_navigate",
    "interact_click",
    "interact_fill",
    "interact_select",
    "interact_hover",
    "interact_upload_file",
    "interact_drag",
    "interact_press_key"
  ],

  network_testing: [
    "network_expect_response",
    "network_assert_response",
    "http_get",
    "http_post",
    "http_put",
    "http_patch",
    "http_delete"
  ],

  configuration: [
    "config_user_agent",
    "config_viewport",
    "config_color_scheme",
    "browser_close"
  ],

  navigation: [
    "nav_back",
    "nav_forward",
    "nav_click_and_switch_tab"
  ]
};
```

**Implementation Phases:**

**Phase 3.1a: Basic Keyword Classification (Week 1-2)**
- Implement keyword-based intent classifier
- Add tool category metadata to registry
- Update ListToolsRequestSchema handler to filter based on intent
- Test with common user queries
- Fallback to all tools if confidence < 0.7

**Phase 3.1b: ML-Based Classification (Week 3-4, optional)**
- Train simple classifier on logged user queries (if available)
- Use embeddings similarity for intent matching
- Improve classification accuracy

**Phase 3.1c: Context-Aware Filtering (Week 5-6)**
- Consider conversation history for context
- Track which tools were recently used
- Suggest follow-up tools based on workflow patterns

**Expected Impact:**
- Tool selection time: -70%
- Wrong tool selections: -85%
- Redundant tool calls: -60%
- User satisfaction: +40%

**Measurement:**
```typescript
// Add telemetry
interface ToolSelectionMetrics {
  toolsPresented: number;
  toolSelected: string;
  wasRelevant: boolean;
  timeTakenMs: number;
  intent: UserIntent;
}

// Log every tool selection for analysis
logger.logToolSelection(metrics);
```

---

### 3.2 Multi-Agent Routing Architecture

**Priority:** 🟢 STRATEGIC
**Effort:** Very High (4-6 weeks)
**Impact:** Very High (40% improvement in tool correctness)

**Concept:**

Deploy specialized MCP servers, each with 5-7 tools focused on specific domains.

**Architecture Options:**

#### Option A: Separate MCP Servers (Recommended)

```bash
# Deploy multiple servers
mcp-playwright-structural  # 8 tools for layout debugging
mcp-playwright-visual      # 3 tools for human output
mcp-playwright-interaction # 10 tools for browser automation
mcp-playwright-network     # 7 tools for HTTP/network testing
```

**Configuration (claude_desktop_config.json):**
```json
{
  "mcpServers": {
    "playwright-structural": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-playwright", "--mode=structural"]
    },
    "playwright-visual": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-playwright", "--mode=visual"]
    },
    "playwright-interaction": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-playwright", "--mode=interaction"]
    }
  }
}
```

**Implementation:**
```typescript
// New CLI flag: --mode
const mode = args.mode || "all";

const toolSubsets = {
  structural: ["structural_inspect_dom", "structural_compare_positions", ...],
  visual: ["visual_screenshot_for_humans", "visual_export_pdf", ...],
  interaction: ["interact_click", "interact_fill", ...],
  all: [...allTools]
};

const activeTools = toolSubsets[mode];
```

**Benefits:**
- ✅ Users can load only relevant server for their task
- ✅ Reduces tool count from 34 to 5-10 per server
- ✅ Clear separation of concerns
- ✅ Easier to optimize each server independently

**Drawbacks:**
- ❌ Users must know which server to use
- ❌ Multiple server processes = more overhead
- ❌ Switching between tasks requires different servers

#### Option B: Server-Side Agent Routing (Alternative)

Single server with internal routing:

```typescript
// In index.ts
const agentRouter = new AgentRouter();

server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  const agent = agentRouter.selectAgent(request.context);
  return { tools: agent.getTools() };
});
```

**Benefits:**
- ✅ Single server for users
- ✅ Automatic agent selection
- ✅ Can switch agents mid-conversation

**Drawbacks:**
- ❌ More complex server logic
- ❌ Still presents too many tools if routing fails

**Recommendation:** Start with Option A (separate servers via --mode flag), evaluate Option B later

---

### 3.3 Tool Usage Analytics & Continuous Improvement

**Priority:** 🟢 STRATEGIC
**Effort:** Medium (1-2 weeks)
**Impact:** Medium (enables data-driven optimization)

**Implement Telemetry:**

```typescript
// src/telemetry/toolMetrics.ts

interface ToolUsageMetric {
  timestamp: Date;
  toolName: string;
  args: any;
  executionTimeMs: number;
  success: boolean;
  errorType?: string;
  tokenCost?: number;
  userIntent?: string;
  wasRedundant?: boolean;  // Did it contribute to outcome?
}

class ToolMetricsCollector {
  private metrics: ToolUsageMetric[] = [];

  record(metric: ToolUsageMetric) {
    this.metrics.push(metric);
    this.analyzePatterns();
  }

  analyzePatterns() {
    // Detect redundant tool usage
    // Identify frequently misused tools
    // Track tool call chains
    // Measure efficiency metrics
  }

  generateReport(): MetricsReport {
    return {
      redundantToolUsageRate: this.calculateRedundantRate(),
      mostMisusedTools: this.identifyMisusedTools(),
      averageToolChainLength: this.averageChainLength(),
      toolSelectionAccuracy: this.calculateAccuracy()
    };
  }
}
```

**Privacy-Preserving Implementation:**
- Don't log user data/URLs
- Only log tool names, execution times, success/failure
- Store locally, optional anonymous reporting
- Provide opt-out mechanism

**Use Metrics To:**
1. Identify tools that need better descriptions
2. Detect new misuse patterns
3. Measure impact of improvements
4. Prioritize future optimizations

---

## Implementation Timeline

### Sprint 1 (Week 1): Critical Naming Changes
- ✅ Day 1-2: Rename `screenshot` → `visual_screenshot_for_humans`
- ✅ Day 3-4: Add ❌ WRONG / ✅ RIGHT descriptions
- ✅ Day 5: Update response warnings
- 📊 Measure: Screenshot misuse rate before/after

### Sprint 2 (Week 2): Full Semantic Namespacing
- ✅ Day 1-2: Plan full naming migration, create backward compatibility
- ✅ Day 3-5: Rename all 34 tools with category prefixes
- ✅ Day 5: Update tests and documentation

### Sprint 3 (Week 3): Tool Consolidation & detail_level
- ✅ Day 1-2: Consolidate extraction tools
- ✅ Day 3-5: Add `detail_level` to structural_inspect_dom
- 📊 Measure: Token reduction in typical workflows

### Sprint 4-5 (Week 4-5): RAG-Based Filtering
- ✅ Week 4: Implement keyword-based intent classifier
- ✅ Week 5: Integrate with ListToolsRequestSchema, test filtering
- 📊 Measure: Tool selection accuracy, time to complete tasks

### Sprint 6-8 (Week 6-8): Multi-Agent Architecture (Optional)
- ✅ Week 6: Design --mode flag, create tool subsets
- ✅ Week 7: Implement server routing
- ✅ Week 8: Documentation, user testing
- 📊 Measure: User satisfaction, tool correctness rate

---

## Success Metrics

### Primary KPIs

| Metric | Current (Baseline) | Target | How to Measure |
|--------|-------------------|--------|----------------|
| **Redundant Tool Usage Rate** | 40% (estimated) | <10% | (Unnecessary calls) / (Total calls) |
| **Screenshot Misuse for Layout** | ~40% of screenshot calls | <5% | Track screenshot calls followed by Read tool for layout tasks |
| **Tool Selection Accuracy** | Unknown | >90% | (Correct tool selected) / (Total tool selections) |
| **Average Token Cost per Task** | Unknown | -40% | Measure tokens consumed in complete workflows |
| **Tool Call Chain Length** | Unknown | -30% | Average tools called per user query |
| **Wrong Tool Selection Rate** | Unknown | <15% | Tools called that returned errors or didn't contribute |

### Secondary KPIs

- Time to complete layout debugging task: -50%
- User satisfaction score: +40%
- Documentation lookup rate: -30% (tools are self-explanatory)
- GitHub issues about tool misuse: -70%

### How to Track

```typescript
// Add to each tool execution
const startTime = Date.now();
const result = await tool.execute(args, context);
const endTime = Date.now();

logger.logToolExecution({
  tool: toolName,
  executionTimeMs: endTime - startTime,
  success: !result.isError,
  tokenEstimate: estimateTokens(result.content)
});
```

---

## Risk Mitigation

### Risk 1: Breaking Changes for Existing Users
**Mitigation:**
- Maintain backward compatibility aliases for 2 major versions
- Clear migration guide in CHANGELOG
- Deprecation warnings with suggested replacements
- Announce timeline well in advance

### Risk 2: Increased Complexity
**Mitigation:**
- Document each change thoroughly
- Provide migration tools/scripts if needed
- Start with high-impact, low-complexity changes first
- Iterate based on feedback

### Risk 3: RAG Filtering May Misclassify Intent
**Mitigation:**
- Always provide fallback to all tools when confidence < 0.7
- Log misclassifications for improvement
- Allow users to manually request "all tools" mode
- Start conservative, increase filtering gradually

### Risk 4: Performance Overhead from Analytics
**Mitigation:**
- Make telemetry opt-in or lightweight by default
- Use sampling (log 10% of requests)
- Async logging to avoid blocking tool execution
- Periodic batch uploads rather than real-time

---

## Questions for Stakeholders

1. **Naming Strategy:**
   - Should we use prefixes (`structural_*`) or suffixes (`*_structural`)?
   - Are we comfortable with longer tool names for clarity?

2. **Backward Compatibility:**
   - How long should we maintain old tool names?
   - Should aliases be permanent or temporary?

3. **Multi-Agent Architecture:**
   - Is separate server deployment acceptable?
   - Should this be optional (--mode flag) or required?

4. **Analytics:**
   - Are we comfortable collecting anonymous usage metrics?
   - What privacy constraints must we respect?

5. **Timeline:**
   - Can we dedicate 2-3 weeks to this work?
   - Should we do phased rollout or big-bang release?

---

## Next Steps

1. ✅ **Review this document** - Gather feedback from team
2. ✅ **Prioritize phases** - Confirm timeline and resource allocation
3. ✅ **Create GitHub issues** - Track each recommendation as separate issue
4. ✅ **Implement Phase 1** - Start with screenshot rename (highest ROI)
5. 📊 **Measure baseline** - Establish current metrics before changes
6. 🔄 **Iterate** - Measure impact of each phase, adjust strategy

---

## References

- **TOOL_DESIGN_PRINCIPLES.md** - Full research and patterns
- **Anthropic: "Writing effective tools for AI agents"** - https://www.anthropic.com/engineering/writing-tools-for-agents
- **RAG Best Practices: Optimizing Tool Calling** - Paragon, 2025
- **MCP Specification** - https://modelcontextprotocol.io/

---

**Document Owner:** Development Team
**Last Updated:** 2025-10-31
**Next Review:** After Phase 1 completion
