import { createToolDefinitions, getBrowserToolNames } from '../tools/common/registry.js';

describe('Tool Definitions', () => {
  const toolDefinitions = createToolDefinitions();

  test('should return an array of tool definitions', () => {
    expect(Array.isArray(toolDefinitions)).toBe(true);
    expect(toolDefinitions.length).toBeGreaterThan(0);
  });

  test('each tool definition should have required properties', () => {
    toolDefinitions.forEach(tool => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      expect(tool.inputSchema).toHaveProperty('type');
      expect(tool.inputSchema).toHaveProperty('properties');
    });
  });

  test('browser tool list should contain registered tool names', () => {
    const browserTools = getBrowserToolNames();
    expect(Array.isArray(browserTools)).toBe(true);
    expect(browserTools.length).toBeGreaterThan(0);
    
    browserTools.forEach(toolName => {
      expect(toolDefinitions.some(tool => tool.name === toolName)).toBe(true);
    });
  });


  test('should validate navigate tool schema', () => {
    const navigateTool = toolDefinitions.find(tool => tool.name === 'navigate');
    expect(navigateTool).toBeDefined();
    expect(navigateTool!.inputSchema.properties).toHaveProperty('url');
    expect(navigateTool!.inputSchema.properties).toHaveProperty('waitUntil');
    expect(navigateTool!.inputSchema.properties).toHaveProperty('timeout');
    expect(navigateTool!.inputSchema.properties).toHaveProperty('width');
    expect(navigateTool!.inputSchema.properties).toHaveProperty('height');
    expect(navigateTool!.inputSchema.properties).toHaveProperty('headless');
    expect(navigateTool!.inputSchema.properties).toHaveProperty('device');
    expect(navigateTool!.inputSchema.required).toEqual(['url']);
  });

  test('should validate go_back tool schema', () => {
    const goBackTool = toolDefinitions.find(tool => tool.name === 'go_back');
    expect(goBackTool).toBeDefined();
    expect(goBackTool!.inputSchema.properties).toEqual({});
    expect(goBackTool!.inputSchema.required).toEqual([]);
  });

  test('should validate go_forward tool schema', () => {
    const goForwardTool = toolDefinitions.find(tool => tool.name === 'go_forward');
    expect(goForwardTool).toBeDefined();
    expect(goForwardTool!.inputSchema.properties).toEqual({});
    expect(goForwardTool!.inputSchema.required).toEqual([]);
  });

  test('should validate drag tool schema', () => {
    const dragTool = toolDefinitions.find(tool => tool.name === 'drag');
    expect(dragTool).toBeDefined();
    expect(dragTool!.inputSchema.properties).toHaveProperty('sourceSelector');
    expect(dragTool!.inputSchema.properties).toHaveProperty('targetSelector');
    expect(dragTool!.inputSchema.required).toEqual(['sourceSelector', 'targetSelector']);
  });

  test('should validate press_key tool schema', () => {
    const pressKeyTool = toolDefinitions.find(tool => tool.name === 'press_key');
    expect(pressKeyTool).toBeDefined();
    expect(pressKeyTool!.inputSchema.properties).toHaveProperty('key');
    expect(pressKeyTool!.inputSchema.properties).toHaveProperty('selector');
    expect(pressKeyTool!.inputSchema.required).toEqual(['key']);
  });

  test('should validate upload_file tool schema', () => {
    const uploadFileTool = toolDefinitions.find(tool => tool.name === 'upload_file');
    expect(uploadFileTool).toBeDefined();
    expect(uploadFileTool!.inputSchema.properties).toHaveProperty('selector');
    expect(uploadFileTool!.inputSchema.properties).toHaveProperty('filePath');
    expect(uploadFileTool!.inputSchema.required).toEqual(['selector', 'filePath']);
  });

  test('should validate wait_for_network_idle tool schema', () => {
    const waitForNetworkIdleTool = toolDefinitions.find(tool => tool.name === 'wait_for_network_idle');
    expect(waitForNetworkIdleTool).toBeDefined();
    expect(waitForNetworkIdleTool!.inputSchema.properties).toHaveProperty('timeout');
    expect(waitForNetworkIdleTool!.inputSchema.required).toEqual([]);
  });

  test('should have 34 tools registered as browser tools', () => {
    const browserTools = getBrowserToolNames();
    expect(browserTools.length).toBe(34);
  });

  test('should have all tool definitions available (35 total incl. confirm tool)', () => {
    // Removed HTTP API, codegen, iframe, and other unused tools; includes confirm_output
    expect(toolDefinitions.length).toBe(35);
  });

  test('browser tool list should only contain web inspection tools', () => {
    const browserTools = getBrowserToolNames();
    const expectedTools = [
      'navigate', 'go_back', 'go_forward', 'scroll_to_element', 'scroll_by', 'visual_screenshot_for_humans', 'close',
      'inspect_dom', 'inspect_ancestors', 'get_test_ids', 'query_selector', 'find_by_text',
      'check_visibility', 'compare_element_alignment', 'element_exists',
      'get_computed_styles', 'measure_element', 'get_text', 'get_html', 'get_console_logs', 'clear_console_logs',
      'click', 'fill', 'hover', 'select', 'upload_file', 'drag', 'press_key',
      'evaluate', 'wait_for_element', 'wait_for_network_idle', 'list_network_requests', 'get_request_details',
      'set_color_scheme'
    ];

    expect(browserTools.sort()).toEqual(expectedTools.sort());
  });

  test('should not include removed tools in browser tool list', () => {
    const browserTools = getBrowserToolNames();
    const removedTools = ['get', 'post', 'put', 'patch', 'delete', 'save_pdf',
                          'start_codegen_session', 'end_codegen_session',
                          'iframe_click', 'iframe_fill', 'click_and_switch_tab',
                          'expect_response', 'assert_response', 'set_user_agent'];

    removedTools.forEach(toolName => {
      expect(browserTools.includes(toolName)).toBe(false);
    });
  });
}); 
