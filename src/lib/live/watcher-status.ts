/**
 * Which log watcher is running, as it reports itself every few seconds
 * (POST /api/watcher/status). Memory only: after a restart it is unknown until
 * the next heartbeat; a watcher that stopped reporting counts as stopped.
 */
export type WatcherReport = { owner: string; logRoot: string; file: string | null; running: boolean };

const STALE_MS = 60_000;
const g = globalThis as unknown as { hsWatcher?: { report: WatcherReport | null; at: number } };
const state = g.hsWatcher ?? (g.hsWatcher = { report: null, at: 0 });

export function reportWatcher(report: WatcherReport, now = Date.now()): void {
  state.report = report;
  state.at = now;
}

export function watcherStatus(now = Date.now()): (WatcherReport & { lastSeen: string }) | null {
  if (!state.report || !state.report.running || now - state.at > STALE_MS) return null;
  return { ...state.report, lastSeen: new Date(state.at).toISOString() };
}
