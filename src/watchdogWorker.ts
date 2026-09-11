import { workerData } from "node:worker_threads";
import { isOrphaned } from "./watchdog.js";

const { originalPpid, pollMs } = workerData as { originalPpid: number; pollMs: number };

setInterval(() => {
  if (!isOrphaned(originalPpid, process.ppid)) return;
  // Deliberately SIGKILL rather than exit(): by the time we get here the main
  // thread may be wedged, so anything that needs the event loop (signal
  // handlers, process.exit, flushing stdio) will never run. SIGKILL is handled
  // by the kernel and is the only thing guaranteed to land.
  process.kill(process.pid, "SIGKILL");
}, pollMs);
// Note: this interval is deliberately NOT unref'd. It is the only thing keeping
// the watchdog thread's event loop alive; the parent side calls worker.unref()
// so the watchdog never holds the server process open by itself.
