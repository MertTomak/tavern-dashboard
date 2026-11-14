/**
 * Tavern Dashboard, the Mac app. The main process:
 * - starts the dashboard server (Next.js) and opens it in a window,
 * - reads the Hearthstone logs (the one log watcher, see src/lib/watcher/lock.ts),
 * - shows today's record in the menu bar and a notification when a game is saved.
 */
import "./env";
import path from "node:path";
import { app, Notification } from "electron";
import { t } from "@/i18n";
import { DATA_DIR, LOG_ROOT } from "@/lib/paths";
import { waitForWatcherLock, type WatcherLock } from "@/lib/watcher/lock";
import { describeGame, LogWatcher } from "@/lib/watcher/log-watcher";
import type { GameRecord } from "@/lib/parser/record";
import { openDashboard } from "./dashboard-window";
import { startServer, type DashboardServer } from "./server";
import { listenToServer } from "./live-events";
import { openedAtLogin, registerSettingsIpc } from "./settings";
import { flushState, readState } from "./store";
import { createTray, refreshTray } from "./tray";

let server: DashboardServer | null = null;
let watcher: LogWatcher | null = null;
let lock: WatcherLock | null = null;

const say = (msg: string) => console.log(msg);

function showDashboard() {
  if (server) openDashboard(server.url);
}

const trayActions = { openDashboard: showDashboard };
/** Today's record also changes at midnight, with no event: refresh now and then. */
const TRAY_REFRESH_MS = 5 * 60_000;

function onHearthstoneStarted() {
  say("▶ Hearthstone started");
  if (readState().openWithHearthstone) showDashboard();
}

function notifySaved(games: GameRecord[], imported: number) {
  if (!imported || !Notification.isSupported()) return;
  const n = new Notification({ title: t.desktop.gameSaved, body: games.map(describeGame).join("\n"), silent: true });
  n.on("click", () => server && openDashboard(server.url, "/games"));
  n.show();
}

async function startWatcher(url: string) {
  lock = await waitForWatcherLock("Tavern Dashboard app", (holder) =>
    say(`… Another log watcher is running (${holder.owner}, pid ${holder.pid}). Waiting until it stops.`),
  );
  watcher = new LogWatcher({ owner: "Mac app", logRoot: LOG_ROOT, appUrl: url, hooks: { say, onGamesSent: notifySaved, onHearthstoneStarted } });
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
    const url = server.url;
    registerSettingsIpc();
    if (!openedAtLogin()) showDashboard();
    createTray(trayActions);
    void refreshTray(url, trayActions);
    listenToServer(url, (event) => {
      if (event.type === "games:changed") void refreshTray(url, trayActions);
    });
    setInterval(() => void refreshTray(url, trayActions), TRAY_REFRESH_MS);
    await startWatcher(url);
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
