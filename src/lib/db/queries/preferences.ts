import { eq, like } from "drizzle-orm";
import { db } from "../client";
import { preferences } from "../schema";

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
