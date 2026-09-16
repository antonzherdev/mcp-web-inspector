import { EventEmitter } from 'node:events';
import { isBrokenPipe, safeLogError, installStdioSafety } from '../stdioSafety.js';

const epipe = () => Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });

function fakeProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

describe('isBrokenPipe', () => {
  it('recognises the severed-pipe error codes', () => {
    expect(isBrokenPipe(epipe())).toBe(true);
    expect(isBrokenPipe(Object.assign(new Error('x'), { code: 'ERR_STREAM_DESTROYED' }))).toBe(true);
    expect(isBrokenPipe(Object.assign(new Error('x'), { code: 'ERR_STREAM_WRITE_AFTER_END' }))).toBe(true);
  });

  it('does not swallow unrelated errors', () => {
    expect(isBrokenPipe(new Error('boom'))).toBe(false);
    expect(isBrokenPipe(Object.assign(new Error('x'), { code: 'ENOENT' }))).toBe(false);
    expect(isBrokenPipe(null)).toBe(false);
    expect(isBrokenPipe(undefined)).toBe(false);
  });
});

describe('safeLogError', () => {
  it('never throws when the underlying stream is dead', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => { throw epipe(); });
    try {
      expect(() => safeLogError('anything')).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('installStdioSafety', () => {
  it('exits on an uncaught EPIPE instead of logging into the dead pipe', () => {
    const proc = fakeProcess();
    const exit = jest.fn();
    const log = jest.fn();
    installStdioSafety(proc, { exit, log });

    proc.emit('uncaughtException', epipe());

    expect(exit).toHaveBeenCalledWith(0);
    expect(log).not.toHaveBeenCalled();
  });

  it('still reports ordinary exceptions without exiting', () => {
    const proc = fakeProcess();
    const exit = jest.fn();
    const log = jest.fn();
    installStdioSafety(proc, { exit, log });

    proc.emit('uncaughtException', new Error('ordinary failure'));

    expect(log).toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it('exits on a broken-pipe unhandled rejection', () => {
    const proc = fakeProcess();
    const exit = jest.fn();
    installStdioSafety(proc, { exit, log: jest.fn() });

    proc.emit('unhandledRejection', epipe());

    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits when stdout or stderr emits EPIPE', () => {
    for (const stream of ['stdout', 'stderr'] as const) {
      const proc = fakeProcess();
      const exit = jest.fn();
      installStdioSafety(proc, { exit, log: jest.fn() });

      proc[stream].emit('error', epipe());

      expect(exit).toHaveBeenCalledWith(0);
    }
  });

  it('exits exactly once no matter how many EPIPEs arrive', () => {
    const proc = fakeProcess();
    const exit = jest.fn();
    installStdioSafety(proc, { exit, log: jest.fn() });

    proc.emit('uncaughtException', epipe());
    proc.emit('uncaughtException', epipe());
    proc.stdout.emit('error', epipe());

    expect(exit).toHaveBeenCalledTimes(1);
  });

  // The regression this module exists for. With the previous handler
  // (`console.error` straight into a dead stderr) each EPIPE produced another
  // EPIPE, so this loop never terminated and burned a core indefinitely.
  it('terminates rather than looping when logging itself keeps failing', () => {
    const proc = fakeProcess();
    const exit = jest.fn();
    const log = jest.fn(() => { throw epipe(); });
    installStdioSafety(proc, { exit, log });

    let reentries = 0;
    proc.on('uncaughtException', () => {
      if (++reentries > 50) throw new Error('handler is looping');
    });

    expect(() => proc.emit('uncaughtException', epipe())).not.toThrow();
    expect(exit).toHaveBeenCalledWith(0);
    expect(log).not.toHaveBeenCalled();
  });

  it('removes every listener it installed when disposed', () => {
    const proc = fakeProcess();
    const dispose = installStdioSafety(proc, { exit: jest.fn(), log: jest.fn() });

    dispose();

    expect(proc.listenerCount('uncaughtException')).toBe(0);
    expect(proc.listenerCount('unhandledRejection')).toBe(0);
    expect(proc.stdout.listenerCount('error')).toBe(0);
    expect(proc.stderr.listenerCount('error')).toBe(0);
  });
});
