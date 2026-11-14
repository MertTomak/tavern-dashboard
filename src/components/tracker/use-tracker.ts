"use client";

import { useEffect, useState } from "react";
import { TRACKER } from "@/components/motion/timing";
import { trackerBridge, type PointerPhase, type TrackerSettings } from "@/lib/tracker/bridge";
import type { DeckSize } from "@/lib/tracker/layout";
import { EMPTY_VIEW, type TrackerView } from "@/lib/tracker/view";

export type TrackerState = { view: TrackerView; visible: boolean; deckSize: DeckSize; setDeckSize: (size: DeckSize) => void };

/**
 * The live view and settings a tracker panel shows. In the Mac app they come
 * from the app; in a browser `demo` is a made-up game and settings stay local.
 */
export function useTracker(demo: TrackerView | null): TrackerState {
  const [view, setView] = useState<TrackerView>(demo ?? EMPTY_VIEW);
  const [settings, setSettings] = useState<TrackerSettings>({ deckSize: "M" });
  const [lingering, setLingering] = useState(false);

  useEffect(() => {
    if (demo) return;
    const bridge = trackerBridge();
    if (!bridge) return;
    const offView = bridge.onView(setView);
    const offSettings = bridge.onSettings(setSettings);
    return () => {
      offView();
      offSettings();
    };
  }, [demo]);

  // After the game ends the final state stays readable for a few seconds, then fades.
  useEffect(() => {
    if (view.status !== "over") return;
    queueMicrotask(() => setLingering(true));
    const timer = setTimeout(() => setLingering(false), TRACKER.lingerAfterGame * 1000);
    return () => clearTimeout(timer);
  }, [view.status]);

  return {
    view,
    visible: view.status === "playing" || (view.status === "over" && lingering) || !!demo,
    deckSize: settings.deckSize,
    setDeckSize: (deckSize) => {
      setSettings({ deckSize });
      trackerBridge()?.setDeckSize(deckSize);
    },
  };
}

/** Sends pointer moves to the app while a drag or resize is held (the panel windows have no frame of their own). */
export function pointerDrag(kind: "drag" | "resize") {
  const send = (phase: PointerPhase, x: number, y: number) => trackerBridge()?.[kind](phase, x, y);
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!trackerBridge() || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      send("start", e.screenX, e.screenY);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) send("move", e.screenX, e.screenY);
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      send("end", e.screenX, e.screenY);
    },
  };
}
