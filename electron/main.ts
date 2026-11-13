/**
 * Tavern Dashboard, the Mac app. The main process:
 * - starts the dashboard server (Next.js) and opens it in a window,
 * - reads the Hearthstone logs (the one log watcher, see src/lib/watcher/lock.ts).
 */
import "./env";
import { app, BrowserWindow, shell } from "electron";
import { DATA_DIR, LOG_ROOT } from "@/lib/paths";
import { waitForWatcherLock, type WatcherLock } from "@/lib/watcher/lock";
import { LogWatcher } from "@/lib/watcher/log-watcher";
import { startServer, type DashboardServer } from "./server";

let server: DashboardServer | null = null;
let watcher: LogWatcher | null = null;
let lock: WatcherLock | null = null;
let mainWindow: BrowserWindow | null = null;

const say = (msg: string) => console.log(msg);

function openDashboard() {
  if (!server) return;
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 390,
    minHeight: 600,
    show: false,
    backgroundColor: "#140d08",
    title: "Tavern Dashboard",
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  const origin = new URL(server.url).origin;
  // Links that leave the app open in the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(origin)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => (mainWindow = null));
  void win.loadURL(server.url);
  mainWindow = win;
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
  app.on("second-instance", () => openDashboard());
  app.on("activate", () => openDashboard());

  app.whenReady().then(async () => {
    say(`… Data folder: ${DATA_DIR}`);
    server = await startServer(DATA_DIR);
    openDashboard();
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
      server?.stop();
      app.exit(0);
    })();
  });
}
