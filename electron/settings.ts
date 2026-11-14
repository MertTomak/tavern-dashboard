import { app, ipcMain } from "electron";
import { z } from "zod";
import { DESKTOP_CHANNELS, type DesktopSettings } from "@/lib/desktop/bridge";
import { readState, updateState } from "./store";

/** Settings › Mac app: start at login, open with Hearthstone. */
export function desktopSettings(): DesktopSettings {
  return { openAtLogin: app.getLoginItemSettings().openAtLogin, openWithHearthstone: readState().openWithHearthstone };
}

const setSchema = z.tuple([z.enum(["openAtLogin", "openWithHearthstone"]), z.boolean()]);

export function registerSettingsIpc(): void {
  ipcMain.handle(DESKTOP_CHANNELS.getSettings, () => desktopSettings());
  ipcMain.handle(DESKTOP_CHANNELS.setSetting, (_event, ...args: unknown[]) => {
    const [key, value] = setSchema.parse(args);
    if (key === "openAtLogin") app.setLoginItemSettings({ openAtLogin: value });
    else updateState({ openWithHearthstone: value });
    return { ...desktopSettings(), [key]: value };
  });
}

/** Started by macOS at login: stay in the menu bar instead of opening the window. */
export function openedAtLogin(): boolean {
  return app.getLoginItemSettings().wasOpenedAtLogin === true;
}
