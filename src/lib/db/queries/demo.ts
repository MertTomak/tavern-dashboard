import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../client";
import { decks, deckVersions, games, importBatches } from "../schema";

/** File name of the import batch that groups all demo (seed) games. */
export const SEED_BATCH_NAME = "seed";

export type DemoCounts = { games: number; decks: number };

function seedBatchIds(): number[] {
  return db
    .select({ id: importBatches.id })
    .from(importBatches)
    .where(eq(importBatches.fileName, SEED_BATCH_NAME))
    .all()
    .map((r) => r.id);
}

export function getDemoCounts(): DemoCounts {
  const batchIds = seedBatchIds();
  const gameCount = batchIds.length
    ? (db
        .select({ n: sql<number>`count(*)` })
        .from(games)
        .where(inArray(games.importBatchId, batchIds))
        .get()?.n ?? 0)
    : 0;
  const deckCount =
    db.select({ n: sql<number>`count(*)` }).from(decks).where(eq(decks.isDemo, true)).get()?.n ?? 0;
  return { games: gameCount, decks: deckCount };
}

/** Removes only demo rows (seed batch games and demo decks). Real data is untouched. */
export function clearDemoData(): DemoCounts {
  return db.transaction((tx) => {
    const batchIds = seedBatchIds();
    const demoDeckIds = tx
      .select({ id: decks.id })
      .from(decks)
      .where(eq(decks.isDemo, true))
      .all()
      .map((r) => r.id);

    let removedGames = 0;
    if (batchIds.length) {
      removedGames = tx.delete(games).where(inArray(games.importBatchId, batchIds)).run().changes;
    }
    if (demoDeckIds.length) {
      // A real game that used a demo deck keeps existing, just without the deck link.
      tx.update(games).set({ deckId: null, deckVersionId: null }).where(inArray(games.deckId, demoDeckIds)).run();
      tx.delete(deckVersions).where(inArray(deckVersions.deckId, demoDeckIds)).run();
      tx.delete(decks).where(inArray(decks.id, demoDeckIds)).run();
    }
    if (batchIds.length) tx.delete(importBatches).where(inArray(importBatches.id, batchIds)).run();
    return { games: removedGames, decks: demoDeckIds.length };
  });
}
