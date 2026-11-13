import { z } from "zod";

/**
 * How much of the Overview's visual effects run.
 * - FULL: everything (scroll lean and strips, title bend, depth blur, art melt, ember dissolve).
 * - LIGHT: keeps the transitions; drops the shader melt, the embers and the depth blur.
 * - OFF: plain movement only: no lean or bend, a straight wipe between chapters, no parallax, no shader effects.
 */
export const EFFECTS_LEVELS = ["FULL", "LIGHT", "OFF"] as const;
export type EffectsLevel = (typeof EFFECTS_LEVELS)[number];
export const effectsLevelSchema = z.enum(EFFECTS_LEVELS);
export const DEFAULT_EFFECTS: EffectsLevel = "FULL";

/** What each level switches on. */
export function effectsFlags(level: EffectsLevel) {
  return {
    /** Lean with scroll speed, title bend, strip transition, depth and wall parallax. */
    motion: level !== "OFF",
    /** GPU extras: art melt (and the streaks it hands over), ember dissolve and ember field, depth blur. */
    rich: level === "FULL",
  };
}
