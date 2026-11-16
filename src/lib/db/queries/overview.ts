import { and, asc, eq, gte, notInArray, type SQL } from "drizzle-orm";
import { db } from "../client";
import { archetypes, decks, deckVersions, games } from "../schema";
import type { InsightGame } from "@/lib/stats/insights";
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

export type StatGame = {
  id: string;
  playedAt: string;
  result: OverviewGame["result"];
  playerClass: string;
  opponentClass: string;
  opponentArchetypeId: number | null;
  opponentArchetype: string | null;
  deckId: number | null;
  deckName: string | null;
  durationSec: number | null;
};

/** One-on-one games matching the filters (Battlegrounds has no opponent class), oldest first, for Matchups and Sessions. */
export function getStatGames(q: OverviewQuery = { from: null }): StatGame[] {
  const where: SQL[] = [notInArray(games.mode, ["BATTLEGROUNDS", "BATTLEGROUNDS_DUOS"])];
  if (q.from) where.push(gte(games.playedAt, q.from));
  if (q.mode) where.push(eq(games.mode, q.mode));
  if (q.format) where.push(eq(games.format, q.format));
  return db
    .select({
      id: games.id,
      playedAt: games.playedAt,
      result: games.result,
      playerClass: games.playerClass,
      opponentClass: games.opponentClass,
      opponentArchetypeId: games.opponentArchetypeId,
      opponentArchetype: archetypes.name,
      deckId: games.deckId,
      deckName: decks.name,
      durationSec: games.durationSec,
    })
    .from(games)
    .leftJoin(decks, eq(games.deckId, decks.id))
    .leftJoin(archetypes, eq(games.opponentArchetypeId, archetypes.id))
    .where(and(...where))
    .orderBy(asc(games.playedAt))
    .all();
}

/** One-on-one games matching the filters with what the insight engine compares (start, archetype, deck version). */
export function getInsightGames(q: OverviewQuery = { from: null }): InsightGame[] {
  const where: SQL[] = [notInArray(games.mode, ["BATTLEGROUNDS", "BATTLEGROUNDS_DUOS"])];
  if (q.from) where.push(gte(games.playedAt, q.from));
  if (q.mode) where.push(eq(games.mode, q.mode));
  if (q.format) where.push(eq(games.format, q.format));
  return db
    .select({
      playedAt: games.playedAt,
      result: games.result,
      opponentClass: games.opponentClass,
      opponentArchetype: archetypes.name,
      wentFirst: games.wentFirst,
      deckId: games.deckId,
      deckName: decks.name,
      versionNo: deckVersions.versionNo,
    })
    .from(games)
    .leftJoin(decks, eq(games.deckId, decks.id))
    .leftJoin(deckVersions, eq(games.deckVersionId, deckVersions.id))
    .leftJoin(archetypes, eq(games.opponentArchetypeId, archetypes.id))
    .where(and(...where))
    .orderBy(asc(games.playedAt))
    .all();
}

export function hasAnyGames(): boolean {
  return db.select({ id: games.id }).from(games).limit(1).get() !== undefined;
}
