import { execFile } from "node:child_process";
import path from "node:path";
import { BrowserWindow, globalShortcut, ipcMain, screen, type Rectangle } from "electron";
import { z } from "zod";
import { PREVIEW_GUTTER, TRACKER_CHANNELS } from "@/lib/tracker/bridge";
import { EMPTY_VIEW, type TrackerView } from "@/lib/tracker/view";
import { onScreen, readState, updateState } from "./store";

/**
 * The in-game deck tracker: a slim, transparent, always-on-top panel on the
 * right. Clicks pass through to the game except over the tracker itself.
 * It appears when a game starts and fades out after it ends; ⌥⌘T hides it.
 * It only ever shows the fair-play view built in src/lib/tracker/view.ts.
 */
/**
 * Window sizes include PREVIEW_GUTTER: clear, click-through space left of the
 * panel where a hovered card's full image shows. The panel itself is 252 px wide.
 */
const SIZE = { width: 252 + PREVIEW_GUTTER, minWidth: 210 + PREVIEW_GUTTER, maxWidth: 380 + PREVIEW_GUTTER, minHeight: 320 };
/** After the game ends the page fades out; then the window is hidden. */
const HIDE_AFTER_GAME_MS = 9_000;
const SHORTCUT = "Alt+Command+T";

const pointSchema = z.tuple([z.enum(["start", "move", "end"]), z.number(), z.number()]);

let win: BrowserWindow | null = null;
let view: TrackerView = EMPTY_VIEW;
let userHidden = false;
let hideTimer: NodeJS.Timeout | null = null;

/** Bounds of Hearthstone's window, if it is on screen. Read with CoreGraphics, which needs no extra permission. */
function hearthstoneBounds(): Promise<Rectangle | null> {
  const script = `ObjC.import("CoreGraphics");
const all = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements, $.kCGNullWindowID)));
const w = all.filter((x) => x.kCGWindowOwnerName === "Hearthstone" && x.kCGWindowLayer === 0).sort((a, b) => b.kCGWindowBounds.Width * b.kCGWindowBounds.Height - a.kCGWindowBounds.Width * a.kCGWindowBounds.Height)[0];
JSON.stringify(w ? w.kCGWindowBounds : null);`;
  return new Promise((resolve) => {
    execFile("osascript", ["-l", "JavaScript", "-e", script], { timeout: 3000 }, (err, out) => {
      if (err) return resolve(null);
      const parsed = z.object({ X: z.number(), Y: z.number(), Width: z.number(), Height: z.number() }).nullable().safeParse(JSON.parse(out.trim() || "null"));
      const b = parsed.success ? parsed.data : null;
      resolve(b && b.Width > 400 ? { x: b.X, y: b.Y, width: b.Width, height: b.Height } : null);
    });
  });
}

/** Where the tracker goes: where the user left it, else the right edge of Hearthstone's window, else of the screen. */
async function placement(): Promise<Rectangle> {
  const saved = onScreen(readState().overlay);
  if (saved) return saved;
  const area = (await hearthstoneBounds()) ?? screen.getPrimaryDisplay().workArea;
  const height = Math.max(SIZE.minHeight, Math.round(area.height * 0.82));
  return { x: area.x + area.width - SIZE.width - 8, y: area.y + Math.round((area.height - height) / 2), width: SIZE.width, height };
}

function create(url: string): BrowserWindow {
  const w = new BrowserWindow({
    type: "panel",
    width: SIZE.width,
    height: 640,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    title: "Deck tracker",
    webPreferences: { sandbox: true, contextIsolation: true, preload: path.join(__dirname, "overlay-preload.cjs") },
  });
  // Above full-screen apps and on every Space, without turning the app into a menu-bar-only app.
  w.setAlwaysOnTop(true, "screen-saver");
  w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  w.setIgnoreMouseEvents(true, { forward: true });
  void w.loadURL(new URL("/overlay", url).href);
  w.on("closed", () => (win = null));
  return w;
}

async function show() {
  if (!win || userHidden) return;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
  if (!win.isVisible()) {
    win.setBounds(await placement());
    win.showInactive();
  }
}

function hide() {
  win?.setIgnoreMouseEvents(true, { forward: true });
  win?.hide();
}

/** New view from the tracker session. */
export function updateOverlay(next: TrackerView): void {
  const started = next.status === "playing" && view.status !== "playing";
  view = next;
  win?.webContents.send(TRACKER_CHANNELS.view, view);
  if (started || (next.status === "playing" && !win?.isVisible())) void show();
  if (next.status === "over" && !hideTimer) hideTimer = setTimeout(() => {
    hideTimer = null;
    if (view.status !== "playing") hide();
  }, HIDE_AFTER_GAME_MS);
}

export function toggleOverlay(): void {
  userHidden = !userHidden;
  if (userHidden) hide();
  else if (view.status === "playing") void show();
}

export function setupOverlay(url: string): void {
  win = create(url);
  globalShortcut.register(SHORTCUT, toggleOverlay);

  ipcMain.on(TRACKER_CHANNELS.ready, (e) => e.sender.send(TRACKER_CHANNELS.view, view));
  ipcMain.on(TRACKER_CHANNELS.interactive, (_e, on: unknown) => {
    if (typeof on === "boolean") win?.setIgnoreMouseEvents(!on, { forward: true });
  });

  // Dragging and resizing are done here from the pointer's screen position (the window has no frame).
  let start: { x: number; y: number; bounds: Rectangle } | null = null;
  const pointer = (kind: "drag" | "resize") => (_e: unknown, ...args: unknown[]) => {
    const parsed = pointSchema.safeParse(args);
    if (!parsed.success || !win) return;
    const [phase, x, y] = parsed.data;
    if (phase === "start") start = { x, y, bounds: win.getBounds() };
    if (!start) return;
    const dx = Math.round(x - start.x);
    const dy = Math.round(y - start.y);
    const b = start.bounds;
    if (kind === "drag") win.setBounds({ ...b, x: b.x + dx, y: b.y + dy });
    else {
      // The grip sits bottom-left: dragging left widens toward the board edge, down makes it taller.
      const width = Math.min(SIZE.maxWidth, Math.max(SIZE.minWidth, b.width - dx));
      win.setBounds({ x: b.x + b.width - width, y: b.y, width, height: Math.max(SIZE.minHeight, b.height + dy) });
    }
    if (phase === "end") {
      updateState({ overlay: win.getBounds() });
      start = null;
    }
  };
  ipcMain.on(TRACKER_CHANNELS.drag, pointer("drag"));
  ipcMain.on(TRACKER_CHANNELS.resize, pointer("resize"));
}

export function teardownOverlay(): void {
  globalShortcut.unregisterAll();
}
