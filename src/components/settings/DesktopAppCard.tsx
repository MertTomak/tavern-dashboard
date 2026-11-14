"use client";

import { useEffect, useState } from "react";
import { Laptop } from "lucide-react";
import { toast } from "sonner";
import { FramePanel } from "@/components/tavern/FramePanel";
import { desktopBridge, type DesktopSettingKey, type DesktopSettings } from "@/lib/desktop/bridge";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

/** Settings › Mac app. The switches talk to the app (electron/settings.ts); in a browser they are not offered. */
export function DesktopAppCard() {
  const copy = t.settings.desktop;
  const [settings, setSettings] = useState<DesktopSettings | null>(null);
  const [inApp, setInApp] = useState<boolean | null>(null);

  useEffect(() => {
    const bridge = desktopBridge();
    queueMicrotask(() => setInApp(!!bridge));
    void bridge?.getSettings().then(setSettings);
  }, []);

  async function toggle(key: DesktopSettingKey) {
    const bridge = desktopBridge();
    if (!bridge || !settings) return;
    try {
      setSettings(await bridge.setSetting(key, !settings[key]));
    } catch {
      toast.error(copy.failed);
    }
  }

  const rows: { key: DesktopSettingKey; label: string; hint: string }[] = [
    { key: "openAtLogin", label: copy.openAtLogin, hint: copy.openAtLoginHint },
    { key: "openWithHearthstone", label: copy.openWithHearthstone, hint: copy.openWithHearthstoneHint },
  ];

  return (
    <FramePanel title={copy.title} hint={copy.description} action={<Laptop className="size-4 text-brass" aria-hidden />}>
      {inApp === false ? (
        <p className="rounded-md border border-brass/20 bg-oak-deep/70 p-3 text-sm text-ink-muted">{copy.browserOnly}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((r) => {
            const on = settings?.[r.key] ?? false;
            return (
              <li key={r.key}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={!settings}
                  onClick={() => toggle(r.key)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border p-3 text-left outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait",
                    on ? "border-brass-light bg-oak-deep shadow-glow" : "border-brass/20 bg-oak-deep/60 hover:border-brass/50",
                  )}
                >
                  <span aria-hidden className={cn("mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors", on ? "border-brass-light bg-brass/40" : "border-brass/30 bg-sunken")}>
                    <span className={cn("size-3.5 rounded-full transition-transform duration-200", on ? "translate-x-4 bg-brass-light" : "bg-parchment/40")} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{r.label}</span>
                    <span className="block text-xs text-ink-muted">{r.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </FramePanel>
  );
}
