import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { deckCards, decks, deckVersions } from "../schema";

/** Card dbfIds of each deck's newest version, keyed by deck name. */
export function getLatestDeckCardIds(): Map<string, number[]> {
  const rows = db
    .select({ name: decks.name, versionId: deckVersions.id, versionNo: deckVersions.versionNo, dbfId: deckCards.dbfId })
    .from(decks)
    .innerJoin(deckVersions, eq(deckVersions.deckId, decks.id))
    .innerJoin(deckCards, eq(deckCards.deckVersionId, deckVersions.id))
    .orderBy(desc(deckVersions.versionNo))
    .all();
  const latest = new Map<string, number>();
  const out = new Map<string, number[]>();
  for (const r of rows) {
    const v = latest.get(r.name);
    if (v === undefined) latest.set(r.name, r.versionId);
    else if (v !== r.versionId) continue;
    out.set(r.name, [...(out.get(r.name) ?? []), r.dbfId]);
  }
  return out;
}
