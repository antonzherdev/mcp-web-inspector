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

  test('should validate go_history tool schema', () => {
    const historyTool = toolDefinitions.find(tool => tool.name === 'go_history');
    expect(historyTool).toBeDefined();
    expect(historyTool!.inputSchema.properties).toHaveProperty('direction');
    expect(historyTool!.inputSchema.required).toEqual(['direction']);
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

  test('should have 33 tools registered as browser tools', () => {
    const browserTools = getBrowserToolNames();
    expect(browserTools.length).toBe(33);
  });

  test('should have all tool definitions available (34 total incl. confirm tool)', () => {
    // Removed HTTP API, codegen, iframe, and other unused tools; includes confirm_output
    expect(toolDefinitions.length).toBe(34);
  });

  test('browser tool list should only contain web inspection tools', () => {
    const browserTools = getBrowserToolNames();
    const expectedTools = [
      'navigate', 'go_history', 'scroll_to_element', 'scroll_by', 'visual_screenshot_for_humans', 'close',
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

  // Item #5: every confirm-flow tool surfaces its preview+token behavior up front.
  test('confirm-flow tools start with the [may return preview+token] marker', () => {
    const confirmFlowTools = [
      'evaluate',
      'get_html',
      'get_text',
      'get_console_logs',
      'get_request_details',
      'visual_screenshot_for_humans',
    ];
    confirmFlowTools.forEach(name => {
      const tool = toolDefinitions.find(t => t.name === name);
      expect(tool).toBeDefined();
      expect(tool!.description).toMatch(/^\[may return preview\+token\] /);
    });
  });

  // Item #6: every tool declares MCP ToolAnnotations.
  test('every tool declares annotations', () => {
    toolDefinitions.forEach(tool => {
      expect((tool as any).annotations).toBeDefined();
      expect(typeof (tool as any).annotations).toBe('object');
    });
  });

  test('read-only tools have readOnlyHint=true', () => {
    const readOnly = [
      'inspect_dom', 'inspect_ancestors', 'compare_element_alignment',
      'get_computed_styles', 'check_visibility', 'query_selector', 'get_test_ids',
      'measure_element', 'find_by_text', 'element_exists',
      'get_html', 'get_text', 'get_console_logs', 'get_request_details',
      'list_network_requests', 'visual_screenshot_for_humans', 'confirm_output',
      'wait_for_element', 'wait_for_network_idle',
    ];
    readOnly.forEach(name => {
      const tool = toolDefinitions.find(t => t.name === name);
      expect(tool).toBeDefined();
      expect((tool as any).annotations.readOnlyHint).toBe(true);
    });
  });

  test('state-modifying tools have readOnlyHint=false', () => {
    const stateModifying = [
      'navigate', 'go_history', 'scroll_by', 'scroll_to_element',
      'click', 'fill', 'hover', 'select', 'upload_file', 'drag', 'press_key',
      'set_color_scheme', 'close', 'clear_console_logs', 'evaluate',
    ];
    stateModifying.forEach(name => {
      const tool = toolDefinitions.find(t => t.name === name);
      expect(tool).toBeDefined();
      expect((tool as any).annotations.readOnlyHint).toBe(false);
    });
  });

  test('open-world tools have openWorldHint=true', () => {
    const openWorld = ['navigate', 'go_history', 'evaluate'];
    openWorld.forEach(name => {
      const tool = toolDefinitions.find(t => t.name === name);
      expect(tool).toBeDefined();
      expect((tool as any).annotations.openWorldHint).toBe(true);
    });
  });

  test('no tool currently uses destructiveHint=true', () => {
    // None of our browser-automation tools are destructive in the MCP-spec sense
    // (rm -rf, drop table, kill process). If a future tool is, it should set this
    // explicitly — and this test should be updated alongside.
    toolDefinitions.forEach(tool => {
      expect((tool as any).annotations.destructiveHint).not.toBe(true);
    });
  });
});
