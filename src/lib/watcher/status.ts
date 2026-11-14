import { lastWatcherGame } from "@/lib/db/queries/import";
import { watcherStatus } from "@/lib/live/watcher-status";
import { lockHolder } from "./lock";

/**
 * Settings › Log watcher: the running watcher and the last game it saved. A
 * watcher that reports to another server (the Mac app next to `npm run dev`)
 * is still found through the lock file, just without its folder.
 */
export function currentWatcherStatus() {
  const holder = lockHolder();
  const watcher =
    watcherStatus() ?? (holder ? { owner: holder.owner, logRoot: null, file: null, running: true, lastSeen: new Date(holder.beat).toISOString() } : null);
  return { watcher, lastGame: lastWatcherGame() };
}
