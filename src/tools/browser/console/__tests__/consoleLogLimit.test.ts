import { test, expect, describe } from '@jest/globals';
import { GetConsoleLogsTool } from '../get_console_logs.js';

// Mirrors MAX_STORED_LOGS in GetConsoleLogsTool.
const MAX_STORED_LOGS = 2000;

describe('console log buffer limit', () => {
  test('caps stored logs so a page logging in a loop cannot grow it forever', () => {
    const tool = new GetConsoleLogsTool({} as any);
    for (let i = 0; i < MAX_STORED_LOGS + 500; i++) {
      tool.registerConsoleMessage('log', `message ${i}`);
    }

    expect(tool.getConsoleLogs().length).toBe(MAX_STORED_LOGS);
  });

  test('drops the oldest messages and keeps the most recent', () => {
    const tool = new GetConsoleLogsTool({} as any);
    for (let i = 0; i < MAX_STORED_LOGS + 3; i++) {
      tool.registerConsoleMessage('log', `message ${i}`);
    }

    const logs = tool.getConsoleLogs();
    expect(logs[logs.length - 1]).toBe(`[log] message ${MAX_STORED_LOGS + 2}`);
    expect(logs[0]).toBe('[log] message 3');
    expect(logs).not.toContain('[log] message 0');
  });

  test('leaves buffers below the cap untouched', () => {
    const tool = new GetConsoleLogsTool({} as any);
    tool.registerConsoleMessage('error', 'boom');
    tool.registerConsoleMessage('log', 'hello');

    expect(tool.getConsoleLogs()).toEqual(['[error] boom', '[log] hello']);
  });
});
