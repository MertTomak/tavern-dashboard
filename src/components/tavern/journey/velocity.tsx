"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { motionValue, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionStyle, type MotionValue } from "motion/react";
import { useLenis } from "lenis/react";

/** Lenis velocity (px per frame) at which the lean is at full strength. */
const FULL_SPEED = 55;
/** Caps: the lean stays a hint, never a distortion. */
const MAX_SKEW = 5; // degrees
const MAX_STRETCH = 0.05; // +5 % along the scroll direction
/** Without a scroll event for this long, the scroll counts as stopped. */
const IDLE_MS = 90;

type Velocity = { lean: MotionValue<number>; horizontal: boolean };

const STILL: Velocity = { lean: motionValue(0), horizontal: false };
const VelocityContext = createContext<Velocity>(STILL);

/**
 * Shares the page's scroll speed as `lean`: -1 … 1, signed by direction,
 * sprung so it eases back to 0 as the scroll slows. `horizontal` says the
 * content moves sideways (the Overview journey) rather than up and down.
 */
export function ScrollVelocityProvider({ horizontal, enabled, children }: { horizontal: boolean; enabled: boolean; children: React.ReactNode }) {
  const raw = useMotionValue(0);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  useLenis(
    (lenis) => {
      if (!enabled) return;
      raw.set(Math.max(-1, Math.min(1, lenis.velocity / FULL_SPEED)));
      clearTimeout(idle.current);
      idle.current = setTimeout(() => raw.set(0), IDLE_MS);
    },
    [enabled],
  );
  useEffect(() => () => clearTimeout(idle.current), []);
  const lean = useSpring(raw, { stiffness: 260, damping: 28, mass: 0.6 });
  return <VelocityContext.Provider value={{ lean, horizontal }}>{children}</VelocityContext.Provider>;
}

/**
 * Style for an element that leans and stretches with the scroll: sideways in
 * the journey, vertically on the plain page. `strength` scales it (0 … 1).
 * Never use it on data tables or charts.
 */
export function useLean(strength = 1): MotionStyle {
  const { lean, horizontal } = useContext(VelocityContext);
  const reduce = useReducedMotion();
  // Scrolling down moves journey content to the left: the top leads, so it leans left.
  const skew = useTransform(lean, (v) => v * MAX_SKEW * strength);
  const stretch = useTransform(lean, (v) => 1 + Math.abs(v) * MAX_STRETCH * strength);
  if (reduce) return {};
  // On the plain page only stretch: a vertical skew reads as a broken layout, not as speed.
  return horizontal ? { skewX: skew, scaleX: stretch } : { scaleY: stretch };
}
