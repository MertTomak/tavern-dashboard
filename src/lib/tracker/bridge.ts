import type { TrackerView } from "./view";

/**
 * What the Mac app gives the overlay page (electron/overlay-preload.ts puts it
 * on window.tavernTracker). In a normal browser it is missing.
 */
export type PointerPhase = "start" | "move" | "end";

export type TrackerBridge = {
  /** Calls back with every new view; returns an unsubscribe function. */
  onView: (cb: (view: TrackerView) => void) => () => void;
  /** The pointer is over the tracker (true) or over the game (false): clicks pass through to the game when false. */
  setInteractive: (on: boolean) => void;
  drag: (phase: PointerPhase, screenX: number, screenY: number) => void;
  resize: (phase: PointerPhase, screenX: number, screenY: number) => void;
};

/** Clear space left of the panel, inside the overlay window, where the hovered card's full image appears. */
export const PREVIEW_GUTTER = 216;

export const TRACKER_CHANNELS = {
  view: "tracker:view",
  ready: "tracker:ready",
  interactive: "tracker:interactive",
  drag: "tracker:drag",
  resize: "tracker:resize",
} as const;

export function trackerBridge(): TrackerBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { tavernTracker?: TrackerBridge }).tavernTracker ?? null;
}
