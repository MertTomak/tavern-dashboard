/**
 * What the Mac app offers the dashboard page (electron/preload.ts puts it on
 * window.tavernDesktop). In a normal browser it is missing and the page hides
 * the app-only settings.
 */
export type DesktopSettings = { openAtLogin: boolean; openWithHearthstone: boolean };
export type DesktopSettingKey = keyof DesktopSettings;

export type DesktopBridge = {
  getSettings: () => Promise<DesktopSettings>;
  setSetting: (key: DesktopSettingKey, value: boolean) => Promise<DesktopSettings>;
};

export const DESKTOP_CHANNELS = { getSettings: "settings:get", setSetting: "settings:set" } as const;

export function desktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { tavernDesktop?: DesktopBridge }).tavernDesktop;
  return bridge ?? null;
}
