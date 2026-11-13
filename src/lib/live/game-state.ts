import type { EffectsLevel } from "@/lib/effects";
import { publish } from "./events";

/**
 * Whether a Hearthstone game is in progress, as reported by the log watcher.
 * Held in memory only; it expires if the watcher goes quiet (crash, game closed).
 */
const EXPIRES_MS = 45 * 60_000;
const g = globalThis as unknown as { hsLive?: { inGame: boolean; since: number } };
const state = g.hsLive ?? (g.hsLive = { inGame: false, since: 0 });

export function isInGame(now = Date.now()): boolean {
  return state.inGame && now - state.since < EXPIRES_MS;
}

export function setInGame(inGame: boolean, now = Date.now()): void {
  const changed = isInGame(now) !== inGame;
  state.inGame = inGame;
  state.since = now;
  if (changed) publish({ type: "live:changed", inGame });
}

/** While a game is in progress, Full effects run as Light (keeps the Mac cool next to the game). The saved setting is untouched. */
export function effectiveEffects(saved: EffectsLevel, inGame: boolean): EffectsLevel {
  return inGame && saved === "FULL" ? "LIGHT" : saved;
}
