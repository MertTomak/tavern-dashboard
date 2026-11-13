import fs from "node:fs";
import path from "node:path";
import { app, screen, type Rectangle } from "electron";
import { z } from "zod";

/**
 * The Mac app's own small settings (window places, app switches), kept in
 * app-state.json next to Electron's files. Game data never lives here.
 */
const rect = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() });
const stateSchema = z.object({
  window: rect.extend({ maximized: z.boolean().default(false) }).optional(),
  overlay: rect.optional(),
  openWithHearthstone: z.boolean().default(true),
});
export type AppState = z.infer<typeof stateSchema>;

const file = () => path.join(app.getPath("userData"), "app-state.json");
let cache: AppState | null = null;

export function readState(): AppState {
  if (cache) return cache;
  try {
    cache = stateSchema.parse(JSON.parse(fs.readFileSync(file(), "utf8")));
  } catch {
    cache = stateSchema.parse({});
  }
  return cache;
}

let timer: NodeJS.Timeout | null = null;

/** Saves a change; writes are batched so dragging a window does not hammer the disk. */
export function updateState(patch: Partial<AppState>): void {
  cache = { ...readState(), ...patch };
  if (timer) clearTimeout(timer);
  timer = setTimeout(flushState, 400);
}

/** A saved rectangle, if it still sits mostly on one of the connected screens (displays change). */
export function onScreen<T extends Rectangle>(r: T | undefined): T | undefined {
  if (!r) return undefined;
  const visible = screen.getAllDisplays().some(({ workArea: a }) => {
    const w = Math.min(r.x + r.width, a.x + a.width) - Math.max(r.x, a.x);
    const h = Math.min(r.y + r.height, a.y + a.height) - Math.max(r.y, a.y);
    return w > 120 && h > 80;
  });
  return visible ? r : undefined;
}

/** Writes a pending change right away (on quit). */
export function flushState(): void {
  if (!timer || !cache) return;
  clearTimeout(timer);
  timer = null;
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(cache, null, 2));
}
