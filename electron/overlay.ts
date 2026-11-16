import { execFile } from "node:child_process";
import path from "node:path";
import { BrowserWindow, globalShortcut, ipcMain, screen, type MenuItemConstructorOptions, type Rectangle, type WebContents } from "electron";
import { z } from "zod";
import { t } from "@/i18n";
import { PREVIEW_GUTTER, TRACKER_CHANNELS, type TrackerSettings } from "@/lib/tracker/bridge";
import { DECK_SIZES, PANEL_IDS, PANEL_LIMITS, TITLE_BAR, placePanel, toSaved, type DeckSize, type PanelId, type Rect } from "@/lib/tracker/layout";
import { EMPTY_VIEW, type TrackerView } from "@/lib/tracker/view";
import { readState, updateState } from "./store";

/**
 * The in-game deck tracker: two slim, transparent, always-on-top panels.
 * My deck sits on the right edge; the opponent panel sits top-left, below the
 * opponent's name. Clicks pass through to the game except over a panel.
 * Each panel is its own window: it can be dragged, resized and switched off
 * on its own, and remembers its place relative to the game window.
 * They appear when a game starts and fade out after it ends; ⌥⌘T hides both.
 * They only ever show the fair-play view built in src/lib/tracker/view.ts.
 */
/** After the game ends the page fades out; then the windows are hidden. */
const HIDE_AFTER_GAME_MS = 9_000;
/** While a game is on, follow the game window if it moves or changes size (windowed ↔ full screen). */
const FOLLOW_MS = 5_000;
const SHORTCUT = "Alt+Command+T";

const pointSchema = z.tuple([z.enum(["start", "move", "end"]), z.number(), z.number()]);

const windows = new Map<PanelId, BrowserWindow>();
let view: TrackerView = EMPTY_VIEW;
let userHidden = false;
let hideTimer: NodeJS.Timeout | null = null;
let followTimer: NodeJS.Timeout | null = null;
let dragging = false;
/** The game window (or screen) the panels were last placed on. */
let lastArea: { area: Rect; titleBar: number } | null = null;
let onSettingsChanged: () => void = () => undefined;
let onPickDeck: (deckId: number) => void = () => undefined;

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

/** The game window and its title bar height (none when it fills a screen), else the main screen. */
async function gameArea(): Promise<{ area: Rect; titleBar: number }> {
  const hs = await hearthstoneBounds();
  if (!hs) return { area: screen.getPrimaryDisplay().workArea, titleBar: 0 };
  const fillsScreen = screen.getAllDisplays().some(({ bounds: b }) => b.x === hs.x && b.y === hs.y && b.width === hs.width && b.height === hs.height);
  return { area: hs, titleBar: fillsScreen ? 0 : TITLE_BAR };
}

/** The window is wider than the deck panel: clear, click-through space on its left shows the hovered card. */
const gutter = (panel: PanelId) => (panel === "deck" ? PREVIEW_GUTTER : 0);
const toWindow = (panel: PanelId, r: Rect): Rect => ({ x: r.x - gutter(panel), y: r.y, width: r.width + gutter(panel), height: r.height });
const toPanel = (panel: PanelId, r: Rect): Rect => ({ x: r.x + gutter(panel), y: r.y, width: r.width - gutter(panel), height: r.height });

/** Keeps a panel reachable: at least part of it on a connected screen. */
function reachable(r: Rect): boolean {
  return screen.getAllDisplays().some(({ bounds: a }) => {
    const w = Math.min(r.x + r.width, a.x + a.width) - Math.max(r.x, a.x);
    const h = Math.min(r.y + r.height, a.y + a.height) - Math.max(r.y, a.y);
    return w > 100 && h > 80;
  });
}

function place(panel: PanelId, where: { area: Rect; titleBar: number }) {
  const win = windows.get(panel);
  if (!win) return;
  let rect = placePanel(panel, where.area, where.titleBar, readState().tracker[panel]);
  if (!reachable(rect)) rect = placePanel(panel, where.area, where.titleBar, undefined);
  win.setBounds(toWindow(panel, rect));
}

function create(panel: PanelId, url: string): BrowserWindow {
  const w = new BrowserWindow({
    type: "panel",
    width: 300,
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
    title: t.tracker.panels[panel],
    webPreferences: { sandbox: true, contextIsolation: true, preload: path.join(__dirname, "overlay-preload.cjs") },
  });
  // Above full-screen apps and on every Space, without turning the app into a menu-bar-only app.
  w.setAlwaysOnTop(true, "screen-saver");
  w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  w.setIgnoreMouseEvents(true, { forward: true });
  void w.loadURL(new URL(`/overlay?panel=${panel}`, url).href);
  w.on("closed", () => windows.delete(panel));
  return w;
}

const wanted = (panel: PanelId) => !userHidden && !readState().tracker.hidden[panel];

async function show() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
  const where = await gameArea();
  lastArea = where;
  for (const panel of PANEL_IDS) {
    const win = windows.get(panel);
    if (!win || !wanted(panel) || win.isVisible()) continue;
    place(panel, where);
    win.showInactive();
  }
  followTimer ??= setInterval(() => void follow(), FOLLOW_MS);
}

function hide(panel: PanelId) {
  const win = windows.get(panel);
  win?.setIgnoreMouseEvents(true, { forward: true });
  win?.hide();
}

function hideAll() {
  PANEL_IDS.forEach(hide);
  if (followTimer) clearInterval(followTimer);
  followTimer = null;
}

/** The game window moved or changed size: put the panels back in their places on it. */
async function follow() {
  if (dragging || view.status !== "playing") return;
  const where = await gameArea();
  const a = where.area;
  const b = lastArea?.area;
  if (b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height) return;
  lastArea = where;
  for (const panel of PANEL_IDS) if (windows.get(panel)?.isVisible()) place(panel, where);
}

/** New view from the tracker session. */
export function updateOverlay(next: TrackerView): void {
  const started = next.status === "playing" && view.status !== "playing";
  view = next;
  for (const win of windows.values()) win.webContents.send(TRACKER_CHANNELS.view, view);
  const missing = PANEL_IDS.some((p) => wanted(p) && !windows.get(p)?.isVisible());
  if (started || (next.status === "playing" && missing)) void show();
  if (next.status === "over" && !hideTimer) hideTimer = setTimeout(() => {
    hideTimer = null;
    if (view.status !== "playing") hideAll();
  }, HIDE_AFTER_GAME_MS);
}

/** ⌥⌘T: hides or shows the whole tracker. If both panels were switched off one by one, it switches them back on. */
export function toggleOverlay(): void {
  const { hidden } = readState().tracker;
  if (!userHidden && hidden.deck && hidden.opponent) setTracker({ hidden: { deck: false, opponent: false } });
  else userHidden = !userHidden;
  if (userHidden) hideAll();
  else if (view.status === "playing") void show();
}

const settings = (): TrackerSettings => ({ deckSize: readState().tracker.deckSize });

function setTracker(patch: Partial<ReturnType<typeof readState>["tracker"]>) {
  updateState({ tracker: { ...readState().tracker, ...patch } });
  for (const win of windows.values()) win.webContents.send(TRACKER_CHANNELS.settings, settings());
  onSettingsChanged();
}

function setPanelShown(panel: PanelId, shown: boolean) {
  setTracker({ hidden: { ...readState().tracker.hidden, [panel]: !shown } });
  if (!shown) hide(panel);
  else if (view.status === "playing") void show();
}

/** Menu-bar entries: switch each panel on or off, pick the deck row size. */
export function trackerMenu(): MenuItemConstructorOptions[] {
  const state = readState().tracker;
  return [
    ...PANEL_IDS.map((panel): MenuItemConstructorOptions => ({
      label: t.desktop.showPanel[panel],
      type: "checkbox",
      checked: !state.hidden[panel],
      click: (item) => setPanelShown(panel, item.checked),
    })),
    {
      label: t.desktop.deckSize,
      submenu: DECK_SIZES.map((size): MenuItemConstructorOptions => ({
        label: t.tracker.sizes[size],
        type: "radio",
        checked: state.deckSize === size,
        click: () => setTracker({ deckSize: size }),
      })),
    },
  ];
}

/** The tracker's remembered "Pick your deck" choices (my class → saved deck id). */
export const pickedDecks = {
  get: (cls: string): number | undefined => readState().tracker.pickedDecks[cls],
  set: (cls: string, deckId: number): void => updateState({ tracker: { ...readState().tracker, pickedDecks: { ...readState().tracker.pickedDecks, [cls]: deckId } } }),
};

export function setupOverlay(url: string, onChange: () => void, pickDeck: (deckId: number) => void): void {
  onSettingsChanged = onChange;
  onPickDeck = pickDeck;
  for (const panel of PANEL_IDS) windows.set(panel, create(panel, url));
  globalShortcut.register(SHORTCUT, toggleOverlay);

  const panelOf = (sender: WebContents): PanelId | null => PANEL_IDS.find((p) => windows.get(p)?.webContents === sender) ?? null;

  ipcMain.on(TRACKER_CHANNELS.ready, (e, channel: unknown) => {
    if (channel === TRACKER_CHANNELS.view) e.sender.send(TRACKER_CHANNELS.view, view);
    if (channel === TRACKER_CHANNELS.settings) e.sender.send(TRACKER_CHANNELS.settings, settings());
  });
  ipcMain.on(TRACKER_CHANNELS.interactive, (e, on: unknown) => {
    const panel = panelOf(e.sender);
    if (panel && typeof on === "boolean") windows.get(panel)?.setIgnoreMouseEvents(!on, { forward: true });
  });
  ipcMain.on(TRACKER_CHANNELS.hide, (e) => {
    const panel = panelOf(e.sender);
    if (panel) setPanelShown(panel, false);
  });
  ipcMain.on(TRACKER_CHANNELS.deckSize, (_e, size: unknown) => {
    const parsed = z.enum(DECK_SIZES).safeParse(size);
    if (parsed.success) setTracker({ deckSize: parsed.data satisfies DeckSize });
  });

  ipcMain.on(TRACKER_CHANNELS.pickDeck, (_e, deckId: unknown) => {
    const parsed = z.number().int().positive().safeParse(deckId);
    if (parsed.success) onPickDeck(parsed.data);
  });

  // Dragging and resizing are done here from the pointer's screen position (the windows have no frame).
  let start: { x: number; y: number; bounds: Rect } | null = null;
  const pointer = (kind: "drag" | "resize") => (e: { sender: WebContents }, ...args: unknown[]) => {
    const panel = panelOf(e.sender);
    const win = panel && windows.get(panel);
    const parsed = pointSchema.safeParse(args);
    if (!parsed.success || !panel || !win) return;
    const [phase, x, y] = parsed.data;
    if (phase === "start") {
      start = { x, y, bounds: toPanel(panel, win.getBounds()) };
      dragging = true;
    }
    if (!start) return;
    const dx = Math.round(x - start.x);
    const dy = Math.round(y - start.y);
    const b = start.bounds;
    const limits = PANEL_LIMITS[panel];
    let next: Rect;
    if (kind === "drag") next = { ...b, x: b.x + dx, y: b.y + dy };
    else if (panel === "deck") {
      // The grip sits bottom-left: dragging left widens toward the board, down makes it taller.
      const width = Math.min(limits.maxWidth, Math.max(limits.minWidth, b.width - dx));
      next = { x: b.x + b.width - width, y: b.y, width, height: Math.max(limits.minHeight, b.height + dy) };
    } else {
      // The opponent panel is as tall as what it shows; its right edge sets the width.
      next = { ...b, width: Math.min(limits.maxWidth, Math.max(limits.minWidth, b.width + dx)) };
    }
    win.setBounds(toWindow(panel, next));
    if (phase === "end") {
      const area = lastArea?.area ?? screen.getPrimaryDisplay().workArea;
      setTracker({ [panel]: toSaved(panel, next, area) });
      start = null;
      dragging = false;
    }
  };
  ipcMain.on(TRACKER_CHANNELS.drag, pointer("drag"));
  ipcMain.on(TRACKER_CHANNELS.resize, pointer("resize"));
}

export function teardownOverlay(): void {
  globalShortcut.unregisterAll();
  if (followTimer) clearInterval(followTimer);
}
