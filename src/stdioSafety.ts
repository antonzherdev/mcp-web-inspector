/**
 * Guards for the stdio transport's failure mode.
 *
 * When an MCP client disappears without signalling — a crashed or force-killed
 * editor — this server is left holding stdio descriptors whose peer is gone.
 * Writing to them raises EPIPE. Reporting that error by writing to the very
 * same stream raises EPIPE again, re-entering the error handler and looping
 * without bound, which pins a CPU core for the life of the process.
 *
 * The rules that avoid it: never let a diagnostic write throw, and treat a
 * severed pipe as a shutdown signal rather than something to report.
 */

/** True for errors raised by writing to a stream whose reader is gone. */
export function isBrokenPipe(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | null)?.code;
  return (
    code === 'EPIPE' ||
    code === 'ERR_STREAM_DESTROYED' ||
    code === 'ERR_STREAM_WRITE_AFTER_END'
  );
}

/**
 * console.error that cannot itself throw. Diagnostics are best-effort: losing
 * a log line is always preferable to raising a second error from inside an
 * error handler.
 */
export function safeLogError(...args: unknown[]): void {
  try {
    console.error(...args);
  } catch {
    // stderr is gone. Nothing left to report to, and nothing more to try.
  }
}

export interface StdioSafetyHooks {
  /** Exits the process. Injectable so tests need not terminate the runner. */
  exit: (code: number) => void;
  log: (...args: unknown[]) => void;
}

const defaultHooks: StdioSafetyHooks = {
  exit: (code) => process.exit(code),
  log: safeLogError,
};

/**
 * Installs the guards on `proc`. Returns a disposer so tests (and any future
 * embedding of the server) can remove them again.
 */
export function installStdioSafety(
  proc: NodeJS.EventEmitter & {
    stdout?: NodeJS.EventEmitter;
    stderr?: NodeJS.EventEmitter;
  } = process,
  hooks: Partial<StdioSafetyHooks> = {},
): () => void {
  const { exit, log } = { ...defaultHooks, ...hooks };

  let exiting = false;
  const exitBrokenPipe = () => {
    // The client's end is closed, so this server can neither receive requests
    // nor deliver responses. There is no useful work left.
    if (exiting) return;
    exiting = true;
    exit(0);
  };

  const onUncaught = (err: unknown) => {
    if (isBrokenPipe(err)) return exitBrokenPipe();
    log('Uncaught Exception:', err);
  };

  const onRejection = (reason: unknown) => {
    if (isBrokenPipe(reason)) return exitBrokenPipe();
    log('Unhandled Rejection:', reason);
  };

  // A failed write surfaces as a stream 'error' event, not a throw. Without a
  // listener Node promotes it to an uncaughtException, so handle it at source.
  const onStreamError = (err: unknown) => {
    if (isBrokenPipe(err)) exitBrokenPipe();
  };

  proc.on('uncaughtException', onUncaught);
  proc.on('unhandledRejection', onRejection);
  proc.stdout?.on('error', onStreamError);
  proc.stderr?.on('error', onStreamError);

  return () => {
    proc.off('uncaughtException', onUncaught);
    proc.off('unhandledRejection', onRejection);
    proc.stdout?.off('error', onStreamError);
    proc.stderr?.off('error', onStreamError);
  };
}
