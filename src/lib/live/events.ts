import { EventEmitter } from "node:events";

/**
 * Server-side event bus for the single local app: writes publish here and
 * GET /api/events streams it to open pages (SSE). Lives on globalThis so dev
 * hot reloads don't split publishers and listeners.
 */
export type LiveEvent =
  | { type: "games:changed"; added: { result: "WIN" | "LOSS" | "TIE"; playerClass: string; opponentClass: string }[] }
  | { type: "live:changed"; inGame: boolean };

const g = globalThis as unknown as { hsBus?: EventEmitter };
const bus = g.hsBus ?? (g.hsBus = new EventEmitter().setMaxListeners(100));

export function publish(event: LiveEvent): void {
  bus.emit("event", event);
}

export function subscribe(listener: (event: LiveEvent) => void): () => void {
  bus.on("event", listener);
  return () => bus.off("event", listener);
}
