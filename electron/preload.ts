/**
 * Runs in the dashboard window before the page: hands the page a small,
 * fixed set of app functions (see src/lib/desktop/bridge.ts). Nothing else
 * from Node or Electron reaches the page.
 */
import { contextBridge, ipcRenderer } from "electron";
import { DESKTOP_CHANNELS, type DesktopBridge, type DesktopSettingKey } from "@/lib/desktop/bridge";

const bridge: DesktopBridge = {
  getSettings: () => ipcRenderer.invoke(DESKTOP_CHANNELS.getSettings),
  setSetting: (key: DesktopSettingKey, value: boolean) => ipcRenderer.invoke(DESKTOP_CHANNELS.setSetting, key, value),
};
contextBridge.exposeInMainWorld("tavernDesktop", bridge);
