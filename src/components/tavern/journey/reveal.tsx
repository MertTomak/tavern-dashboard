"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { motionValue, type MotionValue } from "motion/react";

/**
 * Where the Overview runs as a sideways journey. Mirrors the `journey:` CSS
 * variant in globals.css: wide and tall enough, and Reduce motion off. Phones
 * and Reduce motion get a normal vertical page.
 */
export const JOURNEY_QUERY = "(min-width: 768px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(JOURNEY_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useJourneyEnabled(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(JOURNEY_QUERY).matches,
    () => false,
  );
}

type Chapter = {
  /** True once the chapter has arrived; its entrance animations play once. */
  revealed: boolean;
  /** -1 … 1: how far the chapter sits from the centre of the screen (0 = centred). For parallax. */
  offset: MotionValue<number>;
};

const STILL = motionValue(0);
const ChapterContext = createContext<Chapter>({ revealed: true, offset: STILL });

export const ChapterProvider = ChapterContext.Provider;

/** Components inside an Overview chapter read this; outside a journey everything is revealed. */
export function useChapter(): Chapter {
  return useContext(ChapterContext);
}
