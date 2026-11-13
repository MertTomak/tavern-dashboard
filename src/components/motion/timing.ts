import type { Transition } from "motion/react";

/**
 * Motion tokens. Broadcast timing: quick and decisive (150–300 ms), no overshoot.
 * Only transforms and opacity are animated, so nothing causes layout shift.
 */
export const EASE_SNAP = [0.2, 0, 0, 1] as const;

export const DURATION = {
  fast: 0.15,
  base: 0.22,
  slow: 0.3,
  count: 0.6, // KPI count-up on first paint
} as const;

export const snap: Transition = { duration: DURATION.base, ease: EASE_SNAP };

/** Layout moves (re-sorted rows, filter changes): a firm spring with no bounce. */
export const layoutSpring: Transition = { type: "spring", bounce: 0, visualDuration: DURATION.slow };

export const STAGGER = 0.045;

/**
 * Scene motion: page slides and Overview chapter reveals. Longer than UI motion
 * because whole pages and panels move. CSS mirror: --page-slide-* in globals.css.
 */
export const SCENE = {
  pageSlide: 0.5,
  reveal: 0.55,
  /** Delay between items revealed in sequence (dealt cards, lit portraits). */
  step: 0.07,
} as const;

export const EASE_SCENE = [0.65, 0, 0.2, 1] as const;
