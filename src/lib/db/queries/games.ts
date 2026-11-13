import { and, asc, desc, eq, gte, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "../client";
import { decks, deckVersions, gameCardEvents, games } from "../schema";
import type { Filters } from "@/lib/filters";
import type { GameListParams } from "@/lib/games-list";
import { PAGE_SIZE } from "@/lib/games-list";

export type GameRow = {
  id: string;
  playedAt: string;
  mode: (typeof games.$inferSelect)["mode"];
  format: (typeof games.$inferSelect)["format"];
  result: (typeof games.$inferSelect)["result"];
  playerClass: string;
  opponentClass: string;
  deckId: number | null;
  deckName: string | null;
  wentFirst: boolean | null;
  turns: number | null;
  durationSec: number | null;
  rankAfter: number | null;
  legendRank: number | null;
  notes: string | null;
  source: (typeof games.$inferSelect)["source"];
};

const rowColumns = {
  id: games.id,
  playedAt: games.playedAt,
  mode: games.mode,
  format: games.format,
  result: games.result,
  playerClass: games.playerClass,
  opponentClass: games.opponentClass,
  deckId: games.deckId,
  deckName: decks.name,
  wentFirst: games.wentFirst,
  turns: games.turns,
  durationSec: games.durationSec,
  rankAfter: games.rankAfter,
  legendRank: games.legendRank,
  notes: games.notes,
  source: games.source,
};

export type GameListQuery = Pick<Filters, "mode" | "format"> & { from: string | null } & GameListParams;

function whereOf(q: GameListQuery): SQL | undefined {
  const where: SQL[] = [];
  if (q.from) where.push(gte(games.playedAt, q.from));
  if (q.mode) where.push(eq(games.mode, q.mode));
  if (q.format) where.push(eq(games.format, q.format));
  if (q.result) where.push(eq(games.result, q.result));
  if (q.opp) where.push(eq(games.opponentClass, q.opp));
  if (q.deck === "none") where.push(isNull(games.deckId));
  else if (q.deck !== undefined) where.push(eq(games.deckId, q.deck));
  return where.length ? and(...where) : undefined;
}

const SORT_COLUMN = { date: games.playedAt, turns: games.turns, duration: games.durationSec } as const;

/** One page of games for the Games list, plus the total that match. */
export function listGames(q: GameListQuery): { rows: GameRow[]; total: number; page: number; pages: number } {
  const where = whereOf(q);
  const total = db.select({ n: sql<number>`count(*)` }).from(games).where(where).get()?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(q.page, pages);
  const order = q.dir === "asc" ? asc : desc;
  // Unknown turns/length sort last either way; the date breaks ties so paging is stable.
  const column = SORT_COLUMN[q.sort];
  const rows = db
    .select(rowColumns)
    .from(games)
    .leftJoin(decks, eq(games.deckId, decks.id))
    .where(where)
    .orderBy(sql`${column} is null`, order(column), desc(games.playedAt), asc(games.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();
  return { rows, total, page, pages };
}

/** Opponent classes that appear in the user's games (for the filter), most faced first. */
export function opponentClassesFaced(): string[] {
  return db
    .select({ cls: games.opponentClass })
    .from(games)
    .groupBy(games.opponentClass)
    .orderBy(desc(sql`count(*)`), asc(games.opponentClass))
    .all()
    .map((r) => r.cls);
}

export type GameCardEventRow = { side: "FRIENDLY" | "OPPOSING"; dbfId: number; event: (typeof gameCardEvents.$inferSelect)["event"]; turn: number | null };

export function getGame(id: string): (GameRow & { events: GameCardEventRow[] }) | null {
  const row = db.select(rowColumns).from(games).leftJoin(decks, eq(games.deckId, decks.id)).where(eq(games.id, id)).get();
  if (!row) return null;
  const events = db
    .select({ side: gameCardEvents.side, dbfId: gameCardEvents.dbfId, event: gameCardEvents.event, turn: gameCardEvents.turn })
    .from(gameCardEvents)
    .where(eq(gameCardEvents.gameId, id))
    .orderBy(asc(gameCardEvents.id))
    .all();
  return { ...row, events };
}

export type GamePatch = {
  deckId?: number | null;
  rankAfter?: number | null;
  legendRank?: number | null;
  notes?: string | null;
};

/**
 * Edits a game. A deck chosen by hand points at that deck's newest version
 * and is marked manual, so automatic matching never overrides it; clearing the
 * deck by hand is remembered the same way. Returns false if the game is gone,
 * or the deck does not exist or is another class.
 */
export function updateGame(id: string, patch: GamePatch): boolean {
  return db.transaction((tx) => {
    const game = tx.select({ playerClass: games.playerClass }).from(games).where(eq(games.id, id)).get();
    if (!game) return false;
    const set: Partial<typeof games.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (patch.deckId !== undefined) {
      if (patch.deckId === null) {
        Object.assign(set, { deckId: null, deckVersionId: null, deckManual: true });
      } else {
        const deck = tx.select({ cls: decks.playerClass }).from(decks).where(eq(decks.id, patch.deckId)).get();
        if (!deck || deck.cls !== game.playerClass) return false;
        const version = tx
          .select({ id: deckVersions.id })
          .from(deckVersions)
          .where(eq(deckVersions.deckId, patch.deckId))
          .orderBy(desc(deckVersions.versionNo))
          .get();
        Object.assign(set, { deckId: patch.deckId, deckVersionId: version?.id ?? null, deckManual: true });
      }
    }
    if (patch.rankAfter !== undefined) set.rankAfter = patch.rankAfter;
    if (patch.legendRank !== undefined) set.legendRank = patch.legendRank;
    if (patch.notes !== undefined) set.notes = patch.notes;
    tx.update(games).set(set).where(eq(games.id, id)).run();
    return true;
  });
}

/** Deletes a game (its card events go with it). Returns false if it was already gone. */
export function deleteGame(id: string): boolean {
  return db.delete(games).where(eq(games.id, id)).run().changes > 0;
}
