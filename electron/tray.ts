import path from "node:path";
import { app, Menu, nativeImage, Tray } from "electron";
import { z } from "zod";
import { t } from "@/i18n";

/** Menu bar icon with today's record (W–L) next to it. */
const todaySchema = z.object({ wins: z.number(), losses: z.number(), ties: z.number() });

let tray: Tray | null = null;

export type TrayActions = { openDashboard: () => void };

function iconPath(): string {
  const base = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), "assets", "app-icon");
  return path.join(base, "trayTemplate.png");
}

export function createTray(actions: TrayActions): void {
  const image = nativeImage.createFromPath(iconPath());
  image.setTemplateImage(true);
  tray = new Tray(image);
  tray.setToolTip(t.desktop.trayTooltip);
  setMenu(actions, null);
}

function setMenu(actions: TrayActions, label: string | null) {
  tray?.setContextMenu(
    Menu.buildFromTemplate([
      ...(label ? [{ label, enabled: false }, { type: "separator" as const }] : []),
      { label: t.desktop.openDashboard, click: actions.openDashboard },
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
    setMenu(actions, t.desktop.trayTodayLabel(today.wins, today.losses, today.ties));
  } catch {
    // Server not reachable right now; the next refresh fixes it.
  }
}
