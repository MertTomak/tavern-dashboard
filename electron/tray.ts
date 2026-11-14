import path from "node:path";
import { app, Menu, nativeImage, Tray, type MenuItemConstructorOptions } from "electron";
import { z } from "zod";
import { t } from "@/i18n";

/** Menu bar icon with today's record (W–L) next to it. */
const todaySchema = z.object({ wins: z.number(), losses: z.number(), ties: z.number() });

let tray: Tray | null = null;
let todayLabel: string | null = null;

export type TrayActions = { openDashboard: () => void; toggleTracker: () => void; trackerMenu: () => MenuItemConstructorOptions[] };

function iconPath(): string {
  const base = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), "assets", "app-icon");
  return path.join(base, "trayTemplate.png");
}

export function createTray(actions: TrayActions): void {
  const image = nativeImage.createFromPath(iconPath());
  image.setTemplateImage(true);
  tray = new Tray(image);
  tray.setToolTip(t.desktop.trayTooltip);
  rebuildTrayMenu(actions);
}

/** Builds the menu again (today's record or a tracker setting changed). */
export function rebuildTrayMenu(actions: TrayActions): void {
  tray?.setContextMenu(
    Menu.buildFromTemplate([
      ...(todayLabel ? [{ label: todayLabel, enabled: false }, { type: "separator" as const }] : []),
      { label: t.desktop.openDashboard, click: actions.openDashboard },
      { type: "separator" },
      { label: t.desktop.toggleTracker, accelerator: "Alt+Command+T", click: actions.toggleTracker },
      ...actions.trackerMenu(),
      { type: "separator" },
      { label: t.desktop.quit, role: "quit" },
    ]),
  );
}

/** Asks the server for today's games and updates the title and menu. */
export async function refreshTray(url: string, actions: TrayActions): Promise<void> {
  if (!tray) return;
  try {
    const res = await fetch(`${url}/api/games/today`);
    const today = todaySchema.parse(await res.json());
    tray.setTitle(` ${t.desktop.trayToday(today.wins, today.losses)}`, { fontType: "monospacedDigit" });
    todayLabel = t.desktop.trayTodayLabel(today.wins, today.losses, today.ties);
    rebuildTrayMenu(actions);
  } catch {
    // Server not reachable right now; the next refresh fixes it.
  }
}
