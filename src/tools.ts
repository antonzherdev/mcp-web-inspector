import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface SessionConfig {
  saveSession: boolean;
  userDataDir: string;
  screenshotsDir: string;
}

export function createToolDefinitions(sessionConfig?: SessionConfig) {
  // Build dynamic navigate description based on session config
  const sessionEnabled = sessionConfig?.saveSession ?? true;
  const userDataDir = sessionConfig?.userDataDir || './.mcp-web-inspector/user-data';
  const screenshotsDir = sessionConfig?.screenshotsDir || './.mcp-web-inspector/screenshots';

  const navigateDescription = sessionEnabled
    ? `Navigate to a URL. Browser sessions (cookies, localStorage, sessionStorage) are automatically saved in ${userDataDir} directory and persist across restarts. To clear saved sessions, delete the directory.`
    : "Navigate to a URL. Browser starts fresh each time with no persistent session state (started with --no-save-session flag).";

  return [
    {
      name: "navigate",
      description: navigateDescription,
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to navigate to the website specified" },
          browserType: { type: "string", description: "Browser type to use (chromium, firefox, webkit). Defaults to chromium", enum: ["chromium", "firefox", "webkit"] },
          width: { type: "number", description: "Viewport width in pixels (default: 1280)" },
          height: { type: "number", description: "Viewport height in pixels (default: 720)" },
          timeout: { type: "number", description: "Navigation timeout in milliseconds" },
          waitUntil: { type: "string", description: "Navigation wait condition" },
          headless: { type: "boolean", description: "Run browser in headless mode (default: false)" }
        },
        required: ["url"],
      },
    },
    {
      name: "screenshot",
      description: `Take a screenshot of the current page or a specific element. Screenshots are saved to ${screenshotsDir} by default. Example: { name: "login-page", fullPage: true } or { name: "submit-btn", selector: "testid:submit" }`,
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name for the screenshot file (without extension). Example: 'login-page' or 'error-state'"
          },
          selector: {
            type: "string",
            description: "CSS selector or testid shorthand for element to screenshot. Example: '#submit-button' or 'testid:login-form'. Omit to capture full viewport."
          },
          fullPage: {
            type: "boolean",
            description: "Capture entire scrollable page instead of just viewport (default: false)"
          },
          downloadsDir: {
            type: "string",
            description: `Custom directory for saving screenshot (default: ${screenshotsDir}). Example: './my-screenshots'`
          },
        },
        required: ["name"],
      },
    },
    {
      name: "click",
      description: "Click an element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for the element to click" },
        },
        required: ["selector"],
      },
    },
    {
      name: "fill",
      description: "fill out an input field",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for input field" },
          value: { type: "string", description: "Value to fill" },
        },
        required: ["selector", "value"],
      },
    },
    {
      name: "select",
      description: "Select an element on the page with Select tag",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for element to select" },
          value: { type: "string", description: "Value to select" },
        },
        required: ["selector", "value"],
      },
    },
    {
      name: "hover",
      description: "Hover an element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for element to hover" },
        },
        required: ["selector"],
      },
    },
    {
      name: "upload_file",
      description: "Upload a file to an input[type='file'] element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for the file input element" },
          filePath: { type: "string", description: "Absolute path to the file to upload" }
        },
        required: ["selector", "filePath"],
      },
    },
    {
      name: "evaluate",
      description: "Execute JavaScript in the browser console",
      inputSchema: {
        type: "object",
        properties: {
          script: { type: "string", description: "JavaScript code to execute" },
        },
        required: ["script"],
      },
    },
    {
      name: "get_console_logs",
      description: "Retrieve console logs from the browser with filtering options",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Type of logs to retrieve (all, error, warning, log, info, debug, exception)",
            enum: ["all", "error", "warning", "log", "info", "debug", "exception"]
          },
          search: {
            type: "string",
            description: "Text to search for in logs (handles text with square brackets)"
          },
          limit: {
            type: "number",
            description: "Maximum number of logs to return"
          },
          clear: {
            type: "boolean",
            description: "Whether to clear logs after retrieval (default: false)"
          }
        },
        required: [],
      },
    },
    {
      name: "close",
      description: "Close the browser and release all resources",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "get_text",
      description: "Get the visible text content of the current page",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "get_html",
      description: "Get the HTML content of the current page. By default, all <script> tags are removed from the output unless removeScripts is explicitly set to false.",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector to limit the HTML to a specific container" },
          removeScripts: { type: "boolean", description: "Remove all script tags from the HTML (default: true)" },
          removeComments: { type: "boolean", description: "Remove all HTML comments (default: false)" },
          removeStyles: { type: "boolean", description: "Remove all style tags from the HTML (default: false)" },
          removeMeta: { type: "boolean", description: "Remove all meta tags from the HTML (default: false)" },
          cleanHtml: { type: "boolean", description: "Perform comprehensive HTML cleaning (default: false)" },
          minify: { type: "boolean", description: "Minify the HTML output (default: false)" },
          maxLength: { type: "number", description: "Maximum number of characters to return (default: 20000)" }
        },
        required: [],
      },
    },
    {
      name: "go_back",
      description: "Navigate back in browser history",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "go_forward",
      description: "Navigate forward in browser history",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "drag",
      description: "Drag an element to a target location",
      inputSchema: {
        type: "object",
        properties: {
          sourceSelector: { type: "string", description: "CSS selector for the element to drag" },
          targetSelector: { type: "string", description: "CSS selector for the target location" }
        },
        required: ["sourceSelector", "targetSelector"],
      },
    },
    {
      name: "press_key",
      description: "Press a keyboard key",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "Key to press (e.g. 'Enter', 'ArrowDown', 'a')" },
          selector: { type: "string", description: "Optional CSS selector to focus before pressing key" }
        },
        required: ["key"],
      },
    },
    {
      name: "check_visibility",
      description: "Check if an element is visible to the user. CRITICAL for debugging click/interaction failures. Returns detailed visibility information including viewport intersection, clipping by overflow:hidden, and whether element needs scrolling. Supports testid shortcuts (e.g., 'testid:submit-button').",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand (e.g., 'testid:login-button', '#submit', 'text=Click here')"
          },
        },
        required: ["selector"],
      },
    },
    {
      name: "get_position",
      description: "Get the position and size of an element. Returns x, y coordinates and width/height in pixels. Useful for finding where to click or checking element layout. Supports testid shortcuts (e.g., 'testid:submit-button').",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand (e.g., 'testid:login-button', '#submit', 'text=Click here')"
          },
        },
        required: ["selector"],
      },
    },
    {
      name: "inspect_dom",
      description: "Progressive DOM inspection with semantic filtering and spatial layout info. This is the PRIMARY tool for understanding page structure. Returns immediate semantic children only (header, nav, main, form, button, elements with test IDs, ARIA roles, etc.) while automatically drilling through non-semantic wrapper elements (div, span, etc.) up to maxDepth levels. Use without selector for page overview, then drill down by calling again with a child's selector. Returns compact text format with position, visibility, and layout pattern detection. Supports testid shortcuts.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand to inspect. Omit for page overview (defaults to body). Use 'testid:login-form', '#main', etc."
          },
          includeHidden: {
            type: "boolean",
            description: "Include hidden elements in results (default: false)"
          },
          maxChildren: {
            type: "number",
            description: "Maximum number of children to show (default: 20)"
          },
          maxDepth: {
            type: "number",
            description: "Maximum depth to drill through non-semantic wrapper elements when looking for semantic children (default: 5). Increase for extremely deeply nested components, decrease to 1 to see only immediate children without drilling."
          }
        },
        required: [],
      },
    },
    {
      name: "get_test_ids",
      description: "Discover all test identifiers on the page (data-testid, data-test, data-cy, etc.). Returns a compact text list grouped by attribute type. Essential for test-driven workflows and understanding what elements can be reliably selected. Use the returned test IDs with selector shortcuts like 'testid:submit-button'.",
      inputSchema: {
        type: "object",
        properties: {
          attributes: {
            type: "string",
            description: "Comma-separated list of test ID attributes to search for (default: 'data-testid,data-test,data-cy')"
          },
          showAll: {
            type: "boolean",
            description: "If true, display all test IDs without truncation. If false (default), shows first 8 test IDs per attribute with a summary for longer lists."
          }
        },
        required: [],
      },
    },
    {
      name: "query_selector",
      description: "Test a selector and return detailed information about all matched elements. Essential for selector debugging and finding the right element to interact with. Returns compact text format with element tag, position, text content, visibility status, and interaction capability. Shows why elements are hidden (display:none, opacity:0, zero size). Supports testid shortcuts (e.g., 'testid:submit-button'). Use limit parameter to control how many matches to show (default: 10). NEW: Use onlyVisible parameter to filter results (true=visible only, false=hidden only, undefined=all).",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand to test (e.g., 'button.submit', 'testid:login-form', 'text=Sign In')"
          },
          limit: {
            type: "number",
            description: "Maximum number of elements to return detailed info for (default: 10, recommended max: 50)"
          },
          onlyVisible: {
            type: "boolean",
            description: "Filter results by visibility: true = show only visible elements, false = show only hidden elements, undefined/not specified = show all elements (default: undefined)"
          },
          showAttributes: {
            type: "string",
            description: "Comma-separated list of HTML attributes to display for each element (e.g., 'id,name,aria-label,href,type'). If not specified, attributes are not shown."
          }
        },
        required: ["selector"],
      },
    },
    {
      name: "find_by_text",
      description: "Find elements by their text content. Essential for finding elements without good selectors, especially in poorly structured DOM. Returns elements with position, visibility, and interaction state. Supports exact match, case-sensitive search, and NEW: regex pattern matching for advanced text searching (e.g., '/\\d+ items?/' to find elements with numbers).",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to search for in elements. If regex=true, this can be a regex pattern in /pattern/flags format (e.g., '/\\d+/i' for case-insensitive numbers) or a raw pattern string."
          },
          exact: {
            type: "boolean",
            description: "Whether to match text exactly (default: false, allows partial matches). Ignored if regex=true."
          },
          caseSensitive: {
            type: "boolean",
            description: "Whether search should be case-sensitive (default: false). Ignored if regex=true (use regex flags instead)."
          },
          regex: {
            type: "boolean",
            description: "Whether to treat 'text' as a regex pattern (default: false). If true, supports /pattern/flags format or raw pattern. Examples: '/sign.*/i' (case-insensitive), '/\\d+ items?/' (numbers + optional 's')."
          },
          limit: {
            type: "number",
            description: "Maximum number of elements to return (default: 10)"
          }
        },
        required: ["text"],
      },
    },
    {
      name: "get_styles",
      description: "Get computed CSS styles for an element. Essential for understanding why elements behave unexpectedly and debugging layout issues. Returns styles grouped by category (Layout, Visibility, Spacing, Typography). Use properties parameter to request specific CSS properties, or omit for common layout properties.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand (e.g., 'testid:submit-button', '#main')"
          },
          properties: {
            type: "string",
            description: "Comma-separated list of CSS properties to retrieve (e.g., 'display,width,color'). If not specified, returns common layout properties: display, position, width, height, opacity, visibility, z-index, overflow, margin, padding, font-size, font-weight, color, background-color"
          }
        },
        required: ["selector"],
      },
    },
    {
      name: "element_exists",
      description: "Quick check if an element exists on the page. Ultra-lightweight alternative to query_selector_all when you only need existence confirmation. Returns simple exists/not found status. Most common check before attempting interaction. Supports testid shortcuts.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand (e.g., 'testid:submit-button', '#main')"
          }
        },
        required: ["selector"],
      },
    },
    {
      name: "compare_positions",
      description: "Compare positions and alignment of two elements. Validates layout consistency by checking if elements are aligned (top, left, right, bottom) or have the same dimensions (width, height). Essential for visual regression testing and ensuring consistent spacing across components. Returns compact text format with alignment status and difference in pixels.",
      inputSchema: {
        type: "object",
        properties: {
          selector1: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand for the first element (e.g., 'testid:main-header', '#header')"
          },
          selector2: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand for the second element (e.g., 'testid:chat-header', '#secondary-header')"
          },
          checkAlignment: {
            type: "string",
            description: "What to check: 'top', 'left', 'right', 'bottom' (edge alignment), or 'width', 'height' (dimension matching)",
            enum: ["top", "left", "right", "bottom", "width", "height"]
          }
        },
        required: ["selector1", "selector2", "checkAlignment"],
      },
    },
    {
      name: "wait_for_element",
      description: "Wait for an element to reach a specific state (visible, hidden, attached, detached). Better than sleep() for waiting on dynamic content. Returns duration and current element status. Supports testid shortcuts (e.g., 'testid:submit-button').",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector, text selector, or testid shorthand (e.g., 'testid:submit-button', '#loading-spinner')"
          },
          state: {
            type: "string",
            description: "State to wait for: 'visible' (default), 'hidden', 'attached', 'detached'",
            enum: ["visible", "hidden", "attached", "detached"]
          },
          timeout: {
            type: "number",
            description: "Maximum time to wait in milliseconds (default: 10000)"
          }
        },
        required: ["selector"],
      },
    },
    {
      name: "list_network_requests",
      description: "List recent network requests captured by the browser. Returns compact text format with method, URL, status, resource type, timing, and size. Essential for debugging API calls and performance issues. Use get_request_details() to inspect full headers and body for specific requests.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Filter by resource type: 'xhr', 'fetch', 'script', 'stylesheet', 'image', 'font', 'document', etc. Omit to show all types."
          },
          limit: {
            type: "number",
            description: "Maximum number of requests to return, most recent first (default: 50)"
          }
        },
        required: [],
      },
    },
    {
      name: "get_request_details",
      description: "Get detailed information about a specific network request by index (from list_network_requests). Returns request/response headers, body (truncated at 500 chars), timing, and size. Request bodies with passwords are automatically masked. Essential for debugging API responses and investigating failed requests.",
      inputSchema: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description: "Index of the request from list_network_requests output (e.g., [0], [1], etc.)"
          }
        },
        required: ["index"],
      },
    },
  ] as const satisfies Tool[];
}

// Web inspection and debugging tools (browser-requiring)
export const BROWSER_TOOLS = [
  // Navigation & Control
  "navigate",
  "go_back",
  "go_forward",
  "screenshot",

  // DOM Inspection (PRIMARY)
  "inspect_dom",
  "get_test_ids",
  "query_selector",
  "find_by_text",

  // Visibility & Position
  "check_visibility",
  "get_position",
  "compare_positions",
  "element_exists",
  "wait_for_element",

  // Style & Content
  "get_styles",
  "get_text",
  "get_html",
  "get_console_logs",

  // Network Monitoring
  "list_network_requests",
  "get_request_details",

  // Interactions (for debugging/testing workflows)
  "click",
  "fill",
  "hover",
  "select",
  "upload_file",
  "drag",
  "press_key",

  // JavaScript Execution
  "evaluate",

  // Cleanup
  "close"
];

// Removed tools (not needed for web inspection/debugging):
// - HTTP API tools: get, post, put, patch, delete (use dedicated HTTP clients instead)
// - Code generation: start_codegen_session, end_codegen_session, get_codegen_session, clear_codegen_session
// - iFrame interactions: iframe_click, iframe_fill (can be added back if needed)
// - Tab management: click_and_switch_tab
// - Network: expect_response, assert_response
// - Other: set_user_agent, save_pdf

// All available tools (browser tools only)
export const tools = BROWSER_TOOLS;
