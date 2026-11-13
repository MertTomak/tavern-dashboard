import { eq, like } from "drizzle-orm";
import { db } from "../client";
import { preferences } from "../schema";
import { DEFAULT_EFFECTS, effectsLevelSchema, type EffectsLevel } from "@/lib/effects";

const CLASS_ART = "classArt:";

/** Chosen art card per class, e.g. { MAGE: "HERO_08a" }. Classes without a choice are absent. */
export function getClassArtChoices(): Record<string, string> {
  const rows = db.select().from(preferences).where(like(preferences.key, `${CLASS_ART}%`)).all();
  return Object.fromEntries(rows.map((r) => [r.key.slice(CLASS_ART.length), r.value]));
}

/** Saves a class art choice; null goes back to the default (newest-set legendary). */
export function setClassArtChoice(cls: string, cardId: string | null): void {
  const key = `${CLASS_ART}${cls}`;
  if (cardId === null) {
    db.delete(preferences).where(eq(preferences.key, key)).run();
    return;
  }
  db.insert(preferences)
    .values({ key, value: cardId })
    .onConflictDoUpdate({ target: preferences.key, set: { value: cardId, updatedAt: new Date().toISOString() } })
    .run();
}

const EFFECTS = "effects";

/** The Overview effects level; anything unknown falls back to the default. */
export function getEffectsLevel(): EffectsLevel {
  const row = db.select().from(preferences).where(eq(preferences.key, EFFECTS)).get();
  const parsed = effectsLevelSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_EFFECTS;
}

export function setEffectsLevel(level: EffectsLevel): void {
  db.insert(preferences)
    .values({ key: EFFECTS, value: level })
    .onConflictDoUpdate({ target: preferences.key, set: { value: level, updatedAt: new Date().toISOString() } })
    .run();
}

const RANK_PROMPT_SKIP = "rankPrompt:skipped";

/** The ranked game whose rank prompt the user dismissed (only the newest one matters). */
export function getSkippedRankPrompt(): string | null {
  return db.select().from(preferences).where(eq(preferences.key, RANK_PROMPT_SKIP)).get()?.value ?? null;
}

export function skipRankPrompt(gameId: string): void {
  db.insert(preferences)
    .values({ key: RANK_PROMPT_SKIP, value: gameId })
    .onConflictDoUpdate({ target: preferences.key, set: { value: gameId, updatedAt: new Date().toISOString() } })
    .run();
}
