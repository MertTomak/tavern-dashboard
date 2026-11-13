import { BrowserWindow, shell } from "electron";
import { onScreen, readState, updateState } from "./store";

/** The dashboard's own window. Remembers its size, position and whether it was maximised. */
let win: BrowserWindow | null = null;

export function dashboardWindow(): BrowserWindow | null {
  return win;
}

export function openDashboard(url: string, path = "/"): BrowserWindow {
  if (win) {
    if (win.isMinimized()) win.restore();
    if (path !== "/") void win.loadURL(new URL(path, url).href);
    win.show();
    win.focus();
    return win;
  }
  const saved = onScreen(readState().window);
  const w = new BrowserWindow({
    ...(saved ? { x: saved.x, y: saved.y, width: saved.width, height: saved.height } : { width: 1440, height: 900 }),
    minWidth: 390,
    minHeight: 600,
    show: false,
    backgroundColor: "#1c1612",
    title: "Tavern Dashboard",
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  if (saved?.maximized) w.maximize();

  const origin = new URL(url).origin;
  // Links that leave the app open in the default browser.
  w.webContents.setWindowOpenHandler(({ url: target }) => {
    if (!target.startsWith(origin)) void shell.openExternal(target);
    return { action: "deny" };
  });
  w.webContents.on("will-navigate", (event, target) => {
    if (!target.startsWith(origin)) {
      event.preventDefault();
      void shell.openExternal(target);
    }
  });

  const remember = () => {
    if (w.isDestroyed() || w.isMinimized() || w.isFullScreen()) return;
    const maximized = w.isMaximized();
    // While maximised keep the last normal size, so un-maximising returns to it.
    const bounds = maximized ? (readState().window ?? w.getNormalBounds()) : w.getBounds();
    updateState({ window: { ...bounds, maximized } });
  };
  w.on("resize", remember);
  w.on("move", remember);
  w.on("maximize", remember);
  w.on("unmaximize", remember);
  w.once("ready-to-show", () => w.show());
  w.on("closed", () => (win = null));
  void w.loadURL(new URL(path, url).href);
  win = w;
  return w;
}
