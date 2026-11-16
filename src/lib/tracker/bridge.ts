import type { DeckSize, PanelId } from "./layout";
import type { TrackerView } from "./view";

/**
 * What the Mac app gives a tracker panel's page (electron/overlay-preload.ts puts
 * it on window.tavernTracker). In a normal browser it is missing. Every call
 * acts on the panel window it is made from.
 */
export type PointerPhase = "start" | "move" | "end";
export type TrackerSettings = { deckSize: DeckSize };

export type TrackerBridge = {
  /** Calls back with every new view; returns an unsubscribe function. */
  onView: (cb: (view: TrackerView) => void) => () => void;
  /** Calls back with the tracker's settings, now and on every change. */
  onSettings: (cb: (settings: TrackerSettings) => void) => () => void;
  /** The pointer is over the panel (true) or over the game (false): clicks pass through to the game when false. */
  setInteractive: (on: boolean) => void;
  drag: (phase: PointerPhase, screenX: number, screenY: number) => void;
  resize: (phase: PointerPhase, screenX: number, screenY: number) => void;
  /** Hides this panel until it is switched back on from the menu bar. */
  hidePanel: () => void;
  setDeckSize: (size: DeckSize) => void;
  /** "Pick your deck": count down this saved deck now, and next time no deck code is found for this class. */
  pickDeck: (deckId: number) => void;
};

/** Clear space left of the deck panel, inside its window, where the hovered card's full image appears. */
export const PREVIEW_GUTTER = 216;

export const TRACKER_CHANNELS = {
  view: "tracker:view",
  settings: "tracker:settings",
  ready: "tracker:ready",
  interactive: "tracker:interactive",
  drag: "tracker:drag",
  resize: "tracker:resize",
  hide: "tracker:hide",
  deckSize: "tracker:deck-size",
  pickDeck: "tracker:pick-deck",
} as const;

export function trackerBridge(): TrackerBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { tavernTracker?: TrackerBridge }).tavernTracker ?? null;
}

export type { DeckSize, PanelId };
