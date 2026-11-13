/**
 * Live log watcher (npm run watch:logs, or with the app via npm run dev:all).
 * The work is done by src/lib/watcher/log-watcher.ts, shared with the Mac app.
 * If the Mac app (or another watch:logs) is already reading the logs, this one
 * waits and takes over when that one stops.
 */
import { LOG_ROOT } from "@/lib/paths";
import { waitForWatcherLock } from "@/lib/watcher/lock";
import { LogWatcher } from "@/lib/watcher/log-watcher";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const say = (msg: string) => console.log(msg);

async function main() {
  const lock = await waitForWatcherLock("npm run watch:logs", (holder) =>
    say(`… Another log watcher is running (${holder.owner}, pid ${holder.pid}). Waiting until it stops.`),
  );
  const watcher = new LogWatcher({ logRoot: LOG_ROOT, appUrl: APP_URL, hooks: { say } });
  const shutdown = async () => {
    await watcher.stop();
    lock.release();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
  await watcher.start();
}

main().catch((err: unknown) => {
  say(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
