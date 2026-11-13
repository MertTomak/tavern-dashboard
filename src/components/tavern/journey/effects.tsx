"use client";

import { createContext, useContext } from "react";
import { DEFAULT_EFFECTS, effectsFlags, type EffectsLevel } from "@/lib/effects";

const EffectsContext = createContext<ReturnType<typeof effectsFlags>>(effectsFlags(DEFAULT_EFFECTS));

/** Shares the user's Effects setting (Settings › Effects) with everything on the Overview. */
export function EffectsProvider({ level, children }: { level: EffectsLevel; children: React.ReactNode }) {
  return <EffectsContext.Provider value={effectsFlags(level)}>{children}</EffectsContext.Provider>;
}

/** `motion`: scroll-driven lean, bend, strips and parallax. `rich`: shader melt, embers, depth blur. */
export function useEffects() {
  return useContext(EffectsContext);
}
