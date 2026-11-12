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
