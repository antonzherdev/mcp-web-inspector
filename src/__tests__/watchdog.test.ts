import { isOrphaned, startOrphanWatchdog } from '../watchdog.js';

describe('isOrphaned', () => {
  test('reports orphaned once the original parent is gone', () => {
    // Reparented to init: the classic case after the client dies.
    expect(isOrphaned(4072537, 1)).toBe(true);
  });

  test('reports orphaned when reparented to a subreaper rather than init', () => {
    expect(isOrphaned(4072537, 9999)).toBe(true);
  });

  test('stays quiet while the original parent is alive', () => {
    expect(isOrphaned(4072537, 4072537)).toBe(false);
  });

  test('stays quiet when started directly under an init-like parent', () => {
    // Containers and some supervisors legitimately run the server as a child
    // of PID 1; the watchdog must not kill it on the first poll.
    expect(isOrphaned(1, 1)).toBe(false);
    expect(isOrphaned(0, 1)).toBe(false);
  });
});

describe('startOrphanWatchdog', () => {
  const original = process.env.MCP_WEB_INSPECTOR_NO_WATCHDOG;
  afterEach(() => {
    if (original === undefined) delete process.env.MCP_WEB_INSPECTOR_NO_WATCHDOG;
    else process.env.MCP_WEB_INSPECTOR_NO_WATCHDOG = original;
  });

  test('is a no-op when disabled by env var', () => {
    process.env.MCP_WEB_INSPECTOR_NO_WATCHDOG = '1';
    // Returns a callable stop function and spawns nothing.
    expect(() => startOrphanWatchdog()()).not.toThrow();
  });
});
