"use client";

import { useCallback, useEffect, useState } from "react";
import { TRACKER } from "@/components/motion/timing";
import { trackerBridge, type PointerPhase, type TrackerSettings } from "@/lib/tracker/bridge";
import { ROW_GAP, fitRowHeight, type DeckSize } from "@/lib/tracker/layout";
import { EMPTY_VIEW, type TrackerView } from "@/lib/tracker/view";

export type TrackerState = { view: TrackerView; visible: boolean; deckSize: DeckSize; setDeckSize: (size: DeckSize) => void };

/**
 * The live view and settings a tracker panel shows. In the Mac app they come
 * from the app; in a browser `demo` is a made-up game (or a replay, which
 * passes a new view as it plays) and settings stay local.
 */
export function useTracker(demo: TrackerView | null): TrackerState {
  const [live, setView] = useState<TrackerView>(EMPTY_VIEW);
  const view = demo ?? live;
  const isDemo = demo !== null;
  const [settings, setSettings] = useState<TrackerSettings>({ deckSize: "M" });
  const [lingering, setLingering] = useState(false);

  useEffect(() => {
    if (isDemo) return;
    const bridge = trackerBridge();
    if (!bridge) return;
    const offView = bridge.onView(setView);
    const offSettings = bridge.onSettings(setSettings);
    return () => {
      offView();
      offSettings();
    };
  }, [isDemo]);

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

/**
 * Card rows that share their list's height: measures the list and returns the
 * ref for it plus the style that sets the row height (`--row-h`), the text size
 * that goes with it and the gap, as [ref, list style]. With `reserve`, the ref goes
 * on a taller box (the whole panel area) and that many pixels of it are not for rows. Both panels use it, so their rows match.
 */
export function useFitRows(rows: number, size: DeckSize, reserve = 0): [measure: (node: HTMLElement | null) => void | (() => void), style: React.CSSProperties] {
  const [height, setHeight] = useState(0);
  const measure = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setHeight(Math.floor(entry.contentRect.height)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const rowHeight = fitRowHeight(height - reserve, rows, size);
  const fontSize = Math.min(17, Math.max(11, Math.round(rowHeight * 0.4)));
  return [measure, { "--row-h": `${rowHeight}px`, fontSize, gap: ROW_GAP } as React.CSSProperties];
}
