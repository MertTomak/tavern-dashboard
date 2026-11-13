/**
 * Tavern Dashboard, the Mac app. The main process:
 * - starts the dashboard server (Next.js) and opens it in a window,
 * - reads the Hearthstone logs (the one log watcher, see src/lib/watcher/lock.ts).
 */
import "./env";
import path from "node:path";
import { app } from "electron";
import { DATA_DIR, LOG_ROOT } from "@/lib/paths";
import { waitForWatcherLock, type WatcherLock } from "@/lib/watcher/lock";
import { LogWatcher } from "@/lib/watcher/log-watcher";
import { openDashboard } from "./dashboard-window";
import { startServer, type DashboardServer } from "./server";
import { flushState } from "./store";

let server: DashboardServer | null = null;
let watcher: LogWatcher | null = null;
let lock: WatcherLock | null = null;

const say = (msg: string) => console.log(msg);

function showDashboard() {
  if (server) openDashboard(server.url);
}

async function startWatcher(url: string) {
  lock = await waitForWatcherLock("Tavern Dashboard app", (holder) =>
    say(`… Another log watcher is running (${holder.owner}, pid ${holder.pid}). Waiting until it stops.`),
  );
  watcher = new LogWatcher({ logRoot: LOG_ROOT, appUrl: url, hooks: { say } });
  await watcher.start();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", showDashboard);
  app.on("activate", showDashboard);

  app.whenReady().then(async () => {
    say(`… Data folder: ${DATA_DIR}`);
    // The built app gets its icon from the bundle; `npm run app:dev` sets it here.
    if (!app.isPackaged) app.dock?.setIcon(path.join(app.getAppPath(), "assets", "app-icon", "icon.png"));
    server = await startServer(DATA_DIR);
    showDashboard();
    await startWatcher(server.url);
  }).catch((err: unknown) => {
    console.error(err);
    app.quit();
  });

  // Closing the window keeps the app (and the log watcher) running, like other Mac apps.
  app.on("window-all-closed", () => undefined);

  let quitting = false;
  app.on("before-quit", (event) => {
    if (quitting) return;
    quitting = true;
    event.preventDefault();
    void (async () => {
      await watcher?.stop().catch(() => undefined);
      lock?.release();
      flushState();
      server?.stop();
      app.exit(0);
    })();
  });
}
