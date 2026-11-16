import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../client";
import { archetypes, decks, gameCardEvents, games } from "../schema";
import { classifyArchetype, type ArchetypeRule } from "@/lib/stats/archetypes";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | Tx;

export type ArchetypeInput = { name: string; playerClass: string; signatureCards: number[]; minMatches: number };
export type ArchetypeSummary = ArchetypeRule & { games: number };

/** Every archetype rule, by class then name. */
export function listArchetypeRules(tx: Db = db): ArchetypeRule[] {
  return tx
    .select({ id: archetypes.id, name: archetypes.name, playerClass: archetypes.playerClass, signatureCards: archetypes.signatureCards, minMatches: archetypes.minMatches })
    .from(archetypes)
    .orderBy(asc(archetypes.playerClass), asc(archetypes.name))
    .all();
}

/** Archetypes with how many games were classified as each. */
export function listArchetypes(): ArchetypeSummary[] {
  const counts = new Map(
    db
      .select({ id: games.opponentArchetypeId, n: sql<number>`count(*)` })
      .from(games)
      .where(isNotNull(games.opponentArchetypeId))
      .groupBy(games.opponentArchetypeId)
      .all()
      .map((r) => [r.id, r.n]),
  );
  return listArchetypeRules().map((r) => ({ ...r, games: counts.get(r.id) ?? 0 }));
}

/** Opponent cards seen (played or revealed) per game, distinct dbfIds. */
function opponentCards(tx: Db, gameIds?: readonly string[]): Map<string, Set<number>> {
  const where = and(eq(gameCardEvents.side, "OPPOSING"), inArray(gameCardEvents.event, ["PLAYED", "REVEALED"]), gameIds ? inArray(gameCardEvents.gameId, [...gameIds]) : undefined);
  const out = new Map<string, Set<number>>();
  for (const e of tx.select({ gameId: gameCardEvents.gameId, dbfId: gameCardEvents.dbfId }).from(gameCardEvents).where(where).all()) {
    const set = out.get(e.gameId) ?? new Set<number>();
    set.add(e.dbfId);
    out.set(e.gameId, set);
  }
  return out;
}

/**
 * Classifies the opponent of every game (or of the given games) again from
 * the cards they showed. Rules are pure, so this is cheap enough to run
 * whenever an archetype changes. Returns games whose archetype changed.
 */
export function reclassifyOpponents(tx: Db = db, gameIds?: readonly string[]): number {
  if (gameIds && !gameIds.length) return 0;
  const rules = listArchetypeRules(tx);
  const rows = tx
    .select({ id: games.id, cls: games.opponentClass, current: games.opponentArchetypeId })
    .from(games)
    .where(gameIds ? inArray(games.id, [...gameIds]) : undefined)
    .all();
  const seen = opponentCards(tx, gameIds);
  let changed = 0;
  for (const g of rows) {
    const next = classifyArchetype(g.cls, seen.get(g.id) ?? [], rules)?.id ?? null;
    if (next === g.current) continue;
    tx.update(games).set({ opponentArchetypeId: next }).where(eq(games.id, g.id)).run();
    changed++;
  }
  return changed;
}

/** Saves a new archetype and classifies past games again. */
export function createArchetype(input: ArchetypeInput): { id: number; changed: number } {
  return db.transaction((tx) => {
    const id = tx.insert(archetypes).values(input).returning({ id: archetypes.id }).get().id;
    return { id, changed: reclassifyOpponents(tx) };
  });
}

/** Changes an archetype and classifies past games again. Null if it does not exist. */
export function updateArchetype(id: number, input: ArchetypeInput): { changed: number } | null {
  return db.transaction((tx) => {
    if (!tx.update(archetypes).set(input).where(eq(archetypes.id, id)).run().changes) return null;
    return { changed: reclassifyOpponents(tx) };
  });
}

/** Deletes an archetype; its games are classified again (another rule may fit). Null if it was gone. */
export function deleteArchetype(id: number): { changed: number } | null {
  return db.transaction((tx) => {
    tx.update(games).set({ opponentArchetypeId: null }).where(eq(games.opponentArchetypeId, id)).run();
    tx.update(decks).set({ archetypeId: null }).where(eq(decks.archetypeId, id)).run();
    if (!tx.delete(archetypes).where(eq(archetypes.id, id)).run().changes) return null;
    return { changed: reclassifyOpponents(tx) };
  });
}
