/**
 * Tavern Dashboard, the Mac app. The main process:
 * - starts the dashboard server (Next.js) and opens it in a window,
 * - reads the Hearthstone logs (the one log watcher, see src/lib/watcher/lock.ts),
 * - shows today's record in the menu bar and a notification when a game is saved,
 * - drives the in-game deck tracker overlay from the same log lines.
 */
import "./env";
import fs from "node:fs";
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
import { pickedDecks, setupOverlay, teardownOverlay, toggleOverlay, trackerMenu, updateOverlay } from "./overlay";
import { openedAtLogin, registerSettingsIpc } from "./settings";
import { TrackerSession } from "./tracker";
import { flushState, readState } from "./store";
import { createTray, rebuildTrayMenu, refreshTray } from "./tray";

let server: DashboardServer | null = null;
let watcher: LogWatcher | null = null;
let lock: WatcherLock | null = null;
let tracker: TrackerSession | null = null;

/** Status lines go to the console and to app.log in the app's own folder (kept small), so a problem in a live game can be traced afterwards. */
const LOG_MAX_BYTES = 512_000;
function say(msg: string) {
  console.log(msg);
  try {
    const file = path.join(app.getPath("userData"), "app.log");
    if (fs.existsSync(file) && fs.statSync(file).size > LOG_MAX_BYTES) fs.renameSync(file, `${file}.old`);
    fs.appendFileSync(file, `${new Date().toISOString()} ${msg}\n`);
  } catch {
    // The log is a convenience; never let it stop the app.
  }
}

function showDashboard() {
  if (server) openDashboard(server.url);
}

const trayActions = { openDashboard: showDashboard, toggleTracker: toggleOverlay, trackerMenu };
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
  const session = new TrackerSession(url, updateOverlay, say, pickedDecks);
  tracker = session;
  watcher = new LogWatcher({
    owner: "Mac app",
    logRoot: LOG_ROOT,
    appUrl: url,
    hooks: {
      say,
      onGamesSent: notifySaved,
      onHearthstoneStarted,
      onSessionFile: (file) => {
        say(`… Tracker: new log file ${path.basename(path.dirname(file))}`);
        session.reset();
      },
      onDeckQueued: (deck) => session.deckQueued(deck),
      onPowerLine: (line, live) => session.line(line, live),
      onLive: () => session.catchUp(),
    },
  });
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
    setupOverlay(url, () => rebuildTrayMenu(trayActions), (deckId) => void tracker?.pick(deckId));
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
      teardownOverlay();
      server?.stop();
      app.exit(0);
    })();
  });
}
