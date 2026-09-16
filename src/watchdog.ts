import { Worker } from "node:worker_threads";
import { join } from "node:path";

/**
 * Decide whether this process has been orphaned by its original parent.
 *
 * We compare against the parent recorded at startup rather than testing
 * `ppid === 1` outright: a server launched directly by an init-like parent
 * (containers, some supervisors) is legitimately parented to PID 1 and must
 * not shoot itself on the first poll. Any *change* of parent means the
 * process that spawned us is gone and nobody is left to reap us.
 */
export function isOrphaned(originalPpid: number, currentPpid: number): boolean {
  if (originalPpid <= 1) return false; // never had a reapable parent
  return currentPpid !== originalPpid;
}

/**
 * Watch for the client process disappearing, from a thread that cannot be
 * starved by the main one.
 *
 * Signal handlers registered with `process.on('SIGTERM', ...)` only run when
 * the event loop turns, so a server wedged in a synchronous loop ignores every
 * polite shutdown its client sends. Observed in the wild: clients send SIGINT,
 * then SIGTERM, then give up without escalating to SIGKILL, leaving the server
 * spinning on a core and holding its heap for as long as the machine is up.
 *
 * A worker thread has its own event loop and keeps polling regardless of what
 * the main thread is doing, which is what makes it a usable last resort.
 */
export function startOrphanWatchdog(options: { pollMs?: number } = {}): () => void {
  const noop = () => {};
  if (process.env.MCP_WEB_INSPECTOR_NO_WATCHDOG) return noop;

  const originalPpid = process.ppid;
  if (originalPpid <= 1) return noop;

  // Located via the package root the entry point publishes, matching how the
  // rest of the codebase finds package files it needs to spawn.
  const packageRoot = process.env.MCP_WEB_INSPECTOR_PACKAGE_ROOT;
  if (!packageRoot) return noop;

  let worker: Worker;
  try {
    worker = new Worker(join(packageRoot, "dist", "watchdogWorker.js"), {
      workerData: { originalPpid, pollMs: options.pollMs ?? 5000 },
    });
  } catch (err) {
    console.error("Could not start orphan watchdog:", err);
    return noop;
  }

  // Must not hold the process open, and must never take the server down with it.
  worker.unref();
  worker.on("error", (err) => console.error("Orphan watchdog error:", err));

  return () => void worker.terminate();
}
