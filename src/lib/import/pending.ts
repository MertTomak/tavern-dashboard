import { randomUUID } from "node:crypto";
import type { GameRecord } from "@/lib/parser/record";

/**
 * Parsed uploads waiting for the user to confirm. Kept in server memory (one
 * local user), so the confirm step can't be tampered with and the file need
 * not be sent twice. Entries expire after 30 minutes.
 */
type Pending = { records: GameRecord[]; fileName: string; errors: string[]; at: number };

const TTL_MS = 30 * 60_000;
const g = globalThis as unknown as { hsPendingImports?: Map<string, Pending> };
const store = g.hsPendingImports ?? (g.hsPendingImports = new Map());

function prune(now: number) {
  for (const [k, v] of store) if (now - v.at > TTL_MS) store.delete(k);
}

export function holdImport(records: GameRecord[], fileName: string, errors: string[], now = Date.now()): string {
  prune(now);
  const token = randomUUID();
  store.set(token, { records, fileName, errors, at: now });
  return token;
}

/** Takes a held import out (one use). */
export function takeImport(token: string, now = Date.now()): Pending | null {
  prune(now);
  const p = store.get(token) ?? null;
  store.delete(token);
  return p;
}
