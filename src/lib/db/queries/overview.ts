import { and, asc, eq, gte, type SQL } from "drizzle-orm";
import { db } from "../client";
import { decks, games } from "../schema";
import type { OverviewGame } from "@/lib/stats/overview";
import type { Filters } from "@/lib/filters";

export type OverviewQuery = Pick<Filters, "mode" | "format"> & { from: string | null };

/** Games matching the filters, with the fields the Overview needs, oldest first. */
export function getOverviewGames(q: OverviewQuery = { from: null }): OverviewGame[] {
  const where: SQL[] = [];
  if (q.from) where.push(gte(games.playedAt, q.from));
  if (q.mode) where.push(eq(games.mode, q.mode));
  if (q.format) where.push(eq(games.format, q.format));
  return db
    .select({
      id: games.id,
      playedAt: games.playedAt,
      mode: games.mode,
      result: games.result,
      playerClass: games.playerClass,
      opponentClass: games.opponentClass,
      deckName: decks.name,
      rankAfter: games.rankAfter,
      durationSec: games.durationSec,
    })
    .from(games)
    .leftJoin(decks, eq(games.deckId, decks.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(games.playedAt))
    .all();
}

export function hasAnyGames(): boolean {
  return db.select({ id: games.id }).from(games).limit(1).get() !== undefined;
}
