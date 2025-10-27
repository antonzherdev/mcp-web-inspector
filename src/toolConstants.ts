/**
 * Tool constants - separate file to avoid circular dependencies
 */

/**
 * Get list of all browser tool names
 */
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
  "compare_element_alignment",
  "inspect_ancestors",
  "element_exists",
  "wait_for_element",
  "wait_for_network_idle",

  // Style & Content
  "get_computed_styles",
  "measure_element",
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
