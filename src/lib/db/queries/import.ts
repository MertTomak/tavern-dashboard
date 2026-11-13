import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../client";
import { deckCards, decks, deckVersions, gameCardEvents, games, importBatches, watcherState } from "../schema";
import { SEED_BATCH_NAME } from "./demo";
import { bestDeckMatch, type DeckCandidate } from "@/lib/import/deck-match";
import type { GameRecord } from "@/lib/parser/record";

/** Which of these duplicate keys are already saved. */
export function existingHashes(hashes: readonly string[]): Set<string> {
  if (!hashes.length) return new Set();
  const rows = db.select({ h: games.sourceHash }).from(games).where(inArray(games.sourceHash, [...hashes])).all();
  return new Set(rows.map((r) => r.h));
}

/** Real (non-demo, not archived) deck versions of a class, with their cards, for matching a game to a deck. */
function deckCandidates(playerClass: string): DeckCandidate[] {
  const rows = db
    .select({ deckId: decks.id, versionId: deckVersions.id, format: decks.format, dbfId: deckCards.dbfId })
    .from(decks)
    .innerJoin(deckVersions, eq(deckVersions.deckId, decks.id))
    .innerJoin(deckCards, eq(deckCards.deckVersionId, deckVersions.id))
    .where(and(eq(decks.playerClass, playerClass), eq(decks.isDemo, false), eq(decks.archived, false)))
    .all();
  const byVersion = new Map<number, DeckCandidate>();
  for (const r of rows) {
    const c = byVersion.get(r.versionId) ?? { deckId: r.deckId, versionId: r.versionId, format: r.format, cards: new Set<number>() };
    c.cards.add(r.dbfId);
    byVersion.set(r.versionId, c);
  }
  return [...byVersion.values()];
}

export type SavedGame = { id: string; result: GameRecord["result"]; playerClass: string; opponentClass: string; playedAt: string };
export type SaveResult = { imported: number; skipped: number; batchId: number | null; saved: SavedGame[] };

/**
 * Saves parsed games in one transaction. A game whose duplicate key already
 * exists is skipped (counted, not an error). With `batch`, an import batch is
 * recorded so the whole import can be undone in one click.
 */
export function saveParsedGames(records: readonly GameRecord[], opts: { source: "POWER_LOG" | "WATCHER"; batch?: { fileName: string; errors: string[] } }): SaveResult {
  return db.transaction((tx) => {
    const batchId = opts.batch
      ? (tx.insert(importBatches).values({ source: opts.source, fileName: opts.batch.fileName, errors: opts.batch.errors }).returning({ id: importBatches.id }).get()?.id ?? null)
      : null;

    const saved: SavedGame[] = [];
    let skipped = 0;
    for (const r of records) {
      const deck = bestDeckMatch(
        r.format,
        r.cardEvents.filter((e) => e.side === "FRIENDLY").map((e) => e.dbfId),
        deckCandidates(r.playerClass),
      );
      const id = randomUUID();
      const inserted = tx
        .insert(games)
        .values({
          id,
          playedAt: r.startedAt,
          mode: r.mode,
          format: r.format,
          result: r.result,
          playerClass: r.playerClass,
          opponentClass: r.opponentClass,
          deckId: deck?.deckId ?? null,
          deckVersionId: deck?.versionId ?? null,
          wentFirst: r.wentFirst,
          turns: r.turns,
          durationSec: r.durationSec,
          source: opts.source,
          sourceHash: r.sourceHash,
          importBatchId: batchId,
        })
        .onConflictDoNothing({ target: games.sourceHash })
        .run();
      if (inserted.changes === 0) {
        skipped++;
        continue;
      }
      if (r.cardEvents.length) {
        tx.insert(gameCardEvents)
          .values(r.cardEvents.map((e) => ({ gameId: id, side: e.side, dbfId: e.dbfId, event: e.event, turn: e.turn })))
          .run();
      }
      saved.push({ id, result: r.result, playerClass: r.playerClass, opponentClass: r.opponentClass, playedAt: r.startedAt });
    }

    if (batchId !== null) tx.update(importBatches).set({ imported: saved.length, skipped }).where(eq(importBatches.id, batchId)).run();
    return { imported: saved.length, skipped, batchId, saved };
  });
}

export type ImportBatchRow = { id: number; source: string; fileName: string | null; imported: number; skipped: number; remaining: number; createdAt: string };

/** Past imports, newest first (the demo seed batch is managed in Settings, not here). */
export function listImportBatches(limit = 20): ImportBatchRow[] {
  const batches = db
    .select({
      id: importBatches.id,
      source: importBatches.source,
      fileName: importBatches.fileName,
      imported: importBatches.imported,
      skipped: importBatches.skipped,
      createdAt: importBatches.createdAt,
    })
    .from(importBatches)
    .where(ne(importBatches.fileName, SEED_BATCH_NAME))
    .orderBy(desc(importBatches.id))
    .limit(limit)
    .all();
  if (!batches.length) return [];
  // Games still there per batch (some may have been deleted one by one later).
  const counts = db
    .select({ batchId: games.importBatchId, n: sql<number>`count(*)` })
    .from(games)
    .where(inArray(games.importBatchId, batches.map((b) => b.id)))
    .groupBy(games.importBatchId)
    .all();
  const remaining = new Map(counts.map((c) => [c.batchId, c.n]));
  return batches.map((b) => ({ ...b, remaining: remaining.get(b.id) ?? 0 }));
}

/** Undoes an import: removes its games (their card events go with them) and the batch. Returns games removed, or null if not found. */
export function undoImportBatch(id: number): number | null {
  return db.transaction((tx) => {
    const batch = tx.select({ fileName: importBatches.fileName }).from(importBatches).where(eq(importBatches.id, id)).get();
    if (!batch || batch.fileName === SEED_BATCH_NAME) return null;
    const removed = tx.delete(games).where(eq(games.importBatchId, id)).run().changes;
    tx.delete(importBatches).where(eq(importBatches.id, id)).run();
    return removed;
  });
}

/** Where the watcher stopped reading a log file (0 if never read). */
export function getWatcherOffset(filePath: string): number {
  return db.select({ o: watcherState.byteOffset }).from(watcherState).where(eq(watcherState.filePath, filePath)).get()?.o ?? 0;
}

export function setWatcherOffset(filePath: string, byteOffset: number): void {
  db.insert(watcherState)
    .values({ filePath, byteOffset })
    .onConflictDoUpdate({ target: watcherState.filePath, set: { byteOffset, updatedAt: new Date().toISOString() } })
    .run();
}
