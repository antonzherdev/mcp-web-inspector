import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { codegenTools } from './tools/codegen';

export function createToolDefinitions() {
  return [
    // Codegen tools
    {
      name: "start_codegen_session",
      description: "Start a new code generation session to record Playwright actions",
      inputSchema: {
        type: "object",
        properties: {
          options: {
            type: "object",
            description: "Code generation options",
            properties: {
              outputPath: { 
                type: "string", 
                description: "Directory path where generated tests will be saved (use absolute path)" 
              },
              testNamePrefix: { 
                type: "string", 
                description: "Prefix to use for generated test names (default: 'GeneratedTest')" 
              },
              includeComments: { 
                type: "boolean", 
                description: "Whether to include descriptive comments in generated tests" 
              }
            },
            required: ["outputPath"]
          }
        },
        required: ["options"]
      }
    },
    {
      name: "end_codegen_session",
      description: "End a code generation session and generate the test file",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { 
            type: "string", 
            description: "ID of the session to end" 
          }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "get_codegen_session",
      description: "Get information about a code generation session",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { 
            type: "string", 
            description: "ID of the session to retrieve" 
          }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "clear_codegen_session",
      description: "Clear a code generation session without generating a test",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { 
            type: "string", 
            description: "ID of the session to clear" 
          }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "playwright_navigate",
      description: "Navigate to a URL",
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
      name: "playwright_screenshot",
      description: "Take a screenshot of the current page or a specific element",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name for the screenshot" },
          selector: { type: "string", description: "CSS selector for element to screenshot" },
          width: { type: "number", description: "Width in pixels (default: 800)" },
          height: { type: "number", description: "Height in pixels (default: 600)" },
          storeBase64: { type: "boolean", description: "Store screenshot in base64 format (default: true)" },
          fullPage: { type: "boolean", description: "Store screenshot of the entire page (default: false)" },
          savePng: { type: "boolean", description: "Save screenshot as PNG file (default: false)" },
          downloadsDir: { type: "string", description: "Custom downloads directory path (default: user's Downloads folder)" },
        },
        required: ["name"],
      },
    },
    {
      name: "playwright_click",
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
      name: "playwright_iframe_click",
      description: "Click an element in an iframe on the page",
      inputSchema: {
        type: "object",
        properties: {
          iframeSelector: { type: "string", description: "CSS selector for the iframe containing the element to click" },
          selector: { type: "string", description: "CSS selector for the element to click" },
        },
        required: ["iframeSelector", "selector"],
      },
    },
    {
      name: "playwright_iframe_fill",
      description: "Fill an element in an iframe on the page",
      inputSchema: {
        type: "object",
        properties: {
          iframeSelector: { type: "string", description: "CSS selector for the iframe containing the element to fill" },
          selector: { type: "string", description: "CSS selector for the element to fill" },
          value: { type: "string", description: "Value to fill" },
        },
        required: ["iframeSelector", "selector", "value"],
      },
    },
    {
      name: "playwright_fill",
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
      name: "playwright_select",
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
      name: "playwright_hover",
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
      name: "playwright_upload_file",
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
      name: "playwright_evaluate",
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
      name: "playwright_console_logs",
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
      name: "playwright_close",
      description: "Close the browser and release all resources",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "playwright_get",
      description: "Perform an HTTP GET request",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to perform GET operation" }
        },
        required: ["url"],
      },
    },
    {
      name: "playwright_post",
      description: "Perform an HTTP POST request",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to perform POST operation" },
          value: { type: "string", description: "Data to post in the body" },
          token: { type: "string", description: "Bearer token for authorization" },
          headers: { 
            type: "object", 
            description: "Additional headers to include in the request",
            additionalProperties: { type: "string" }
          }
        },
        required: ["url", "value"],
      },
    },
    {
      name: "playwright_put",
      description: "Perform an HTTP PUT request",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to perform PUT operation" },
          value: { type: "string", description: "Data to PUT in the body" },
        },
        required: ["url", "value"],
      },
    },
    {
      name: "playwright_patch",
      description: "Perform an HTTP PATCH request",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to perform PUT operation" },
          value: { type: "string", description: "Data to PATCH in the body" },
        },
        required: ["url", "value"],
      },
    },
    {
      name: "playwright_delete",
      description: "Perform an HTTP DELETE request",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to perform DELETE operation" }
        },
        required: ["url"],
      },
    },
    {
      name: "playwright_expect_response",
      description: "Ask Playwright to start waiting for a HTTP response. This tool initiates the wait operation but does not wait for its completion.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique & arbitrary identifier to be used for retrieving this response later with `Playwright_assert_response`." },
          url: { type: "string", description: "URL pattern to match in the response." }
        },
        required: ["id", "url"],
      },
    },
    {
      name: "playwright_assert_response",
      description: "Wait for and validate a previously initiated HTTP response wait operation.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Identifier of the HTTP response initially expected using `Playwright_expect_response`." },
          value: { type: "string", description: "Data to expect in the body of the HTTP response. If provided, the assertion will fail if this value is not found in the response body." }
        },
        required: ["id"],
      },
    },
    {
      name: "playwright_custom_user_agent",
      description: "Set a custom User Agent for the browser",
      inputSchema: {
        type: "object",
        properties: {
          userAgent: { type: "string", description: "Custom User Agent for the Playwright browser instance" }
        },
        required: ["userAgent"],
      },
    },
    {
      name: "playwright_get_visible_text",
      description: "Get the visible text content of the current page",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "playwright_get_visible_html",
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
      name: "playwright_go_back",
      description: "Navigate back in browser history",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "playwright_go_forward",
      description: "Navigate forward in browser history",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "playwright_drag",
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
      name: "playwright_press_key",
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
      name: "playwright_save_as_pdf",
      description: "Save the current page as a PDF file",
      inputSchema: {
        type: "object",
        properties: {
          outputPath: { type: "string", description: "Directory path where PDF will be saved" },
          filename: { type: "string", description: "Name of the PDF file (default: page.pdf)" },
          format: { type: "string", description: "Page format (e.g. 'A4', 'Letter')" },
          printBackground: { type: "boolean", description: "Whether to print background graphics" },
          margin: {
            type: "object",
            description: "Page margins",
            properties: {
              top: { type: "string" },
              right: { type: "string" },
              bottom: { type: "string" },
              left: { type: "string" }
            }
          }
        },
        required: ["outputPath"],
      },
    },
    {
      name: "playwright_click_and_switch_tab",
      description: "Click a link and switch to the newly opened tab",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for the link to click" },
        },
        required: ["selector"],
      },
    },
    {
      name: "playwright_element_visibility",
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
      name: "playwright_element_position",
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
      name: "playwright_inspect_dom",
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
      name: "playwright_get_test_ids",
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
      name: "playwright_query_selector_all",
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
      name: "playwright_find_by_text",
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
      name: "playwright_get_computed_styles",
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
      name: "playwright_element_exists",
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
      name: "playwright_compare_positions",
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
  ] as const satisfies Tool[];
}

// Browser-requiring tools for conditional browser launch
export const BROWSER_TOOLS = [
  "playwright_navigate",
  "playwright_screenshot",
  "playwright_click",
  "playwright_iframe_click",
  "playwright_iframe_fill",
  "playwright_fill",
  "playwright_select",
  "playwright_hover",
  "playwright_upload_file",
  "playwright_evaluate",
  "playwright_close",
  "playwright_expect_response",
  "playwright_assert_response",
  "playwright_custom_user_agent",
  "playwright_get_visible_text",
  "playwright_get_visible_html",
  "playwright_go_back",
  "playwright_go_forward",
  "playwright_drag",
  "playwright_press_key",
  "playwright_save_as_pdf",
  "playwright_click_and_switch_tab",
  "playwright_element_visibility",
  "playwright_element_position",
  "playwright_inspect_dom",
  "playwright_get_test_ids",
  "playwright_query_selector_all",
  "playwright_find_by_text",
  "playwright_get_computed_styles",
  "playwright_element_exists",
  "playwright_compare_positions"
];

// API Request tools for conditional launch
export const API_TOOLS = [
  "playwright_get",
  "playwright_post",
  "playwright_put",
  "playwright_delete",
  "playwright_patch"
];

// Codegen tools
export const CODEGEN_TOOLS = [
  'start_codegen_session',
  'end_codegen_session',
  'get_codegen_session',
  'clear_codegen_session'
];

// All available tools
export const tools = [
  ...BROWSER_TOOLS,
  ...API_TOOLS,
  ...CODEGEN_TOOLS
];
