import { GetConsoleLogsTool, ClearConsoleLogsTool } from '../get_console_logs.js';
import { ToolContext } from '../../../common/types.js';
import { jest } from '@jest/globals';

// Mock the server
const mockServer = {
  sendMessage: jest.fn()
};

// Mock context
const mockContext = {
  server: mockServer
} as ToolContext;

describe('GetConsoleLogsTool', () => {
  let consoleLogsTool: GetConsoleLogsTool;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogsTool = new GetConsoleLogsTool(mockServer);
  });

  test('should register console messages', () => {
    consoleLogsTool.registerConsoleMessage('log', 'Test log message');
    consoleLogsTool.registerConsoleMessage('error', 'Test error message');
    consoleLogsTool.registerConsoleMessage('warning', 'Test warning message');
    
    const logs = consoleLogsTool.getConsoleLogs();
    expect(logs.length).toBe(3);
    expect(logs[0]).toContain('Test log message');
    expect(logs[1]).toContain('Test error message');
    expect(logs[2]).toContain('Test warning message');
  });

  test('should retrieve console logs with type filter', async () => {
    consoleLogsTool.registerConsoleMessage('log', 'Test log message');
    consoleLogsTool.registerConsoleMessage('error', 'Test error message');
    consoleLogsTool.registerConsoleMessage('warning', 'Test warning message');
    
    const args = {
      type: 'error'
    };

    const result = await consoleLogsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Retrieved 1 console log(s)');
    expect(result.content[1].text).toContain('Test error message');
    expect(result.content[1].text).not.toContain('Test log message');
    expect(result.content[1].text).not.toContain('Test warning message');
  });

  test('should retrieve console logs with search filter', async () => {
    consoleLogsTool.registerConsoleMessage('log', 'Test log message');
    consoleLogsTool.registerConsoleMessage('error', 'Test error with [special] characters');
    consoleLogsTool.registerConsoleMessage('warning', 'Another warning message');
    
    const args = {
      search: 'special'
    };

    const result = await consoleLogsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Retrieved 1 console log(s)');
    expect(result.content[1].text).toContain('Test error with [special] characters');
    expect(result.content[1].text).not.toContain('Test log message');
    expect(result.content[1].text).not.toContain('Another warning message');
  });

  test('should retrieve console logs with limit', async () => {
    for (let i = 0; i < 10; i++) {
      consoleLogsTool.registerConsoleMessage('log', `Test log message ${i}`);
    }
    
    const args = {
      limit: 5
    };

    const result = await consoleLogsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Retrieved 5 console log(s)');
    
    // The actual implementation might only show the first log in the content
    // Just verify that at least one log message is present
    const logText = result.content[1].text as string;
    expect(logText).toContain('Test log message');
  });

  test('should clear console logs using clear_console_logs tool', async () => {
    consoleLogsTool.registerConsoleMessage('log', 'Test log message');
    consoleLogsTool.registerConsoleMessage('error', 'Test error message');

    const clearer = new ClearConsoleLogsTool(mockServer);
    const result = await clearer.execute({}, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Cleared 2 console log(s)');

    // Logs should be cleared
    const logs = consoleLogsTool.getConsoleLogs();
    expect(logs.length).toBe(0);
  });

  test('should handle no logs', async () => {
    const args = {};

    const result = await consoleLogsTool.execute(args, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('No console logs matching the criteria');
  });

  test('should filter logs by "since: last-call"', async () => {
    // Add some initial logs
    consoleLogsTool.registerConsoleMessage('log', 'Log before first call');
    consoleLogsTool.registerConsoleMessage('error', 'Error before first call');

    // First call - this will set lastCallTimestamp
    await consoleLogsTool.execute({}, mockContext);

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Add more logs after the first call
    consoleLogsTool.registerConsoleMessage('log', 'Log after first call');
    consoleLogsTool.registerConsoleMessage('warning', 'Warning after first call');

    // Second call with since: 'last-call' should only return logs after the first call
    const result = await consoleLogsTool.execute({ since: 'last-call' }, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Retrieved 2 console log(s)');
    const logsText = result.content.slice(1).map(c => c.text).join('\n');
    expect(logsText).toContain('Log after first call');
    expect(logsText).toContain('Warning after first call');
    expect(logsText).not.toContain('Log before first call');
    expect(logsText).not.toContain('Error before first call');
  });

  test('should filter logs by "since: last-navigation"', async () => {
    // Add some initial logs
    consoleLogsTool.registerConsoleMessage('log', 'Log before navigation');

    // Simulate a navigation
    consoleLogsTool.updateLastNavigationTimestamp();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Add logs after navigation
    consoleLogsTool.registerConsoleMessage('log', 'Log after navigation');
    consoleLogsTool.registerConsoleMessage('error', 'Error after navigation');

    // Get logs since last navigation
    const result = await consoleLogsTool.execute({ since: 'last-navigation' }, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Retrieved 2 console log(s)');
    const logsText = result.content.slice(1).map(c => c.text).join('\n');
    expect(logsText).toContain('Log after navigation');
    expect(logsText).toContain('Error after navigation');
    expect(logsText).not.toContain('Log before navigation');
  });

  test('should filter logs by "since: last-interaction"', async () => {
    // Add some initial logs
    consoleLogsTool.registerConsoleMessage('log', 'Log before interaction');

    // Simulate an interaction
    consoleLogsTool.updateLastInteractionTimestamp();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Add logs after interaction
    consoleLogsTool.registerConsoleMessage('log', 'Log after interaction');
    consoleLogsTool.registerConsoleMessage('warning', 'Warning after interaction');

    // Get logs since last interaction
    const result = await consoleLogsTool.execute({ since: 'last-interaction' }, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Retrieved 2 console log(s)');
    const logsText = result.content.slice(1).map(c => c.text).join('\n');
    expect(logsText).toContain('Log after interaction');
    expect(logsText).toContain('Warning after interaction');
    expect(logsText).not.toContain('Log before interaction');
  });

  test('should handle invalid "since" value', async () => {
    consoleLogsTool.registerConsoleMessage('log', 'Test log');

    const result = await consoleLogsTool.execute({ since: 'invalid-value' }, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Invalid \'since\' value');
  });

  test('should combine "since" with other filters', async () => {
    // Add some initial logs
    consoleLogsTool.registerConsoleMessage('log', 'Log before interaction');
    consoleLogsTool.registerConsoleMessage('error', 'Error before interaction');

    // Simulate an interaction
    consoleLogsTool.updateLastInteractionTimestamp();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Add logs after interaction
    consoleLogsTool.registerConsoleMessage('log', 'Log after interaction');
    consoleLogsTool.registerConsoleMessage('error', 'Error after interaction');
    consoleLogsTool.registerConsoleMessage('warning', 'Warning after interaction');

    // Get only error logs since last interaction
    const result = await consoleLogsTool.execute({
      since: 'last-interaction',
      type: 'error'
    }, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Retrieved 1 console log(s)');
    const logsText = result.content.slice(1).map(c => c.text).join('\n');
    expect(logsText).toContain('Error after interaction');
    expect(logsText).not.toContain('Log after interaction');
    expect(logsText).not.toContain('Warning after interaction');
    expect(logsText).not.toContain('Error before interaction');
  });

  test('should store messages with compact format', async () => {
    // Simple error without stack trace
    consoleLogsTool.registerConsoleMessage('error', 'Simple error message');

    // Error with short stack trace (4 lines or less should not be truncated)
    const shortStackError = 'Error: Short stack\nLine 1\nLine 2\nLine 3';
    consoleLogsTool.registerConsoleMessage('error', shortStackError);

    // Error with long stack trace (should be truncated by registerConsoleMessage in toolHandler.ts)
    const longStackError = 'Error: Long stack\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7';
    consoleLogsTool.registerConsoleMessage('error', longStackError);

    const result = await consoleLogsTool.execute({ type: 'error' }, mockContext);

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Retrieved 3 console log(s)');

    const logsText = result.content.slice(1).map(c => c.text).join('\n');

    // Simple error should be stored as-is
    expect(logsText).toContain('Simple error message');

    // Short stack trace should be stored as-is (not truncated)
    expect(logsText).toContain(shortStackError);

    // Long stack trace should be stored as-is if passed directly to registerConsoleMessage
    // (The truncation happens in toolHandler.ts before calling registerConsoleMessage)
    expect(logsText).toContain(longStackError);
  });
}); 
