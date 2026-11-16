import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import { deckCards, decks, deckVersions, gameCardEvents, games } from "../schema";
import { bestDeckMatch, MIN_CARDS, type DeckCandidate } from "@/lib/import/deck-match";
import type { ParsedDeck } from "@/lib/cards/deck-code";
import type { CardGame } from "@/lib/stats/cards";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | Tx;

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

export type DeckOption = { id: number; name: string; playerClass: string };

/** The user's real decks that can be picked for a game (not demo, not archived), by name. */
export function listDeckOptions(): DeckOption[] {
  return db
    .select({ id: decks.id, name: decks.name, playerClass: decks.playerClass })
    .from(decks)
    .where(and(eq(decks.isDemo, false), eq(decks.archived, false)))
    .orderBy(asc(decks.name))
    .all();
}

/** Real (non-demo, not archived) deck versions of a class, with their cards, for matching a game to a deck. */
export function deckCandidates(playerClass: string, tx: Db = db): DeckCandidate[] {
  const rows = tx
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

/**
 * Re-matches a class's games to its decks from the cards each game showed.
 * Games whose deck was set by hand, and games with too few known cards to
 * tell (e.g. added by hand), keep what they have. Returns games changed.
 */
export function rematchGames(playerClass: string, tx: Db = db): number {
  const candidates = deckCandidates(playerClass, tx);
  const rows = tx
    .select({ id: games.id, format: games.format, deckId: games.deckId, versionId: games.deckVersionId })
    .from(games)
    .where(and(eq(games.playerClass, playerClass), eq(games.deckManual, false)))
    .all();
  if (!rows.length) return 0;
  const seen = new Map<string, number[]>();
  for (const e of tx
    .select({ gameId: gameCardEvents.gameId, dbfId: gameCardEvents.dbfId })
    .from(gameCardEvents)
    .innerJoin(games, eq(games.id, gameCardEvents.gameId))
    .where(and(eq(games.playerClass, playerClass), eq(gameCardEvents.side, "FRIENDLY")))
    .all()) {
    seen.set(e.gameId, [...(seen.get(e.gameId) ?? []), e.dbfId]);
  }
  let changed = 0;
  for (const g of rows) {
    const cards = seen.get(g.id) ?? [];
    if (new Set(cards).size < MIN_CARDS) continue;
    const m = bestDeckMatch(g.format, cards, candidates);
    const deckId = m?.deckId ?? null;
    const versionId = m?.versionId ?? null;
    if (deckId === g.deckId && versionId === g.versionId) continue;
    tx.update(games).set({ deckId, deckVersionId: versionId, updatedAt: new Date().toISOString() }).where(eq(games.id, g.id)).run();
    changed++;
  }
  return changed;
}

/** The deck that already holds exactly this list, if any. */
export function findDeckByDeckstring(deckstring: string): { deckId: number; name: string; versionNo: number } | null {
  return (
    db
      .select({ deckId: decks.id, name: decks.name, versionNo: deckVersions.versionNo })
      .from(deckVersions)
      .innerJoin(decks, eq(decks.id, deckVersions.deckId))
      .where(eq(deckVersions.deckstring, deckstring))
      .get() ?? null
  );
}

export type SaveDeckResult = { deckId: number; versionNo: number; matched: number } | { error: "duplicate"; name: string } | { error: "notFound" };

/**
 * Saves a pasted deck: a new deck, or a new version of an existing deck of the
 * same class (the old version's games keep pointing at the old version).
 * Then the class's games are matched again so past games find the deck.
 */
export function saveDeck(deck: ParsedDeck, opts: { name: string; versionOf: number | null }): SaveDeckResult {
  return db.transaction((tx) => {
    const dupe = tx
      .select({ name: decks.name })
      .from(deckVersions)
      .innerJoin(decks, eq(decks.id, deckVersions.deckId))
      .where(eq(deckVersions.deckstring, deck.deckstring))
      .get();
    if (dupe) return { error: "duplicate", name: dupe.name } as const;

    let deckId: number;
    let versionNo = 1;
    if (opts.versionOf !== null) {
      const parent = tx.select({ cls: decks.playerClass }).from(decks).where(and(eq(decks.id, opts.versionOf), eq(decks.isDemo, false))).get();
      if (!parent || parent.cls !== deck.playerClass) return { error: "notFound" } as const;
      deckId = opts.versionOf;
      versionNo = (tx.select({ n: sql<number>`max(${deckVersions.versionNo})` }).from(deckVersions).where(eq(deckVersions.deckId, deckId)).get()?.n ?? 0) + 1;
      tx.update(decks).set({ name: opts.name, format: deck.format, archived: false }).where(eq(decks.id, deckId)).run();
    } else {
      deckId = tx.insert(decks).values({ name: opts.name, playerClass: deck.playerClass, format: deck.format }).returning({ id: decks.id }).get().id;
    }
    const versionId = tx.insert(deckVersions).values({ deckId, versionNo, deckstring: deck.deckstring }).returning({ id: deckVersions.id }).get().id;
    tx.insert(deckCards)
      .values(deck.cards.map(([dbfId, count]) => ({ deckVersionId: versionId, dbfId, count })))
      .run();
    const matched = rematchGames(deck.playerClass, tx);
    return { deckId, versionNo, matched };
  });
}

/**
 * Deletes a deck and its versions. Its games stay, without a deck; games
 * that were set to it by hand go back to automatic matching.
 */
export function deleteDeck(id: number): boolean {
  return db.transaction((tx) => {
    const deck = tx.select({ cls: decks.playerClass }).from(decks).where(and(eq(decks.id, id), eq(decks.isDemo, false))).get();
    if (!deck) return false;
    tx.update(games).set({ deckId: null, deckVersionId: null, deckManual: false }).where(eq(games.deckId, id)).run();
    tx.delete(decks).where(eq(decks.id, id)).run();
    rematchGames(deck.cls, tx);
    return true;
  });
}

export type DeckSummary = {
  id: number;
  name: string;
  playerClass: string;
  format: (typeof decks.$inferSelect)["format"];
  createdAt: string;
  versions: number;
  /** Newest version's cards. */
  cards: { dbfId: number; count: number }[];
  results: ("WIN" | "LOSS" | "TIE")[];
  lastPlayed: string | null;
};

/** Real decks with their newest list and every game result, most recently played first. */
export function listDecks(): DeckSummary[] {
  const rows = db
    .select({ id: decks.id, name: decks.name, playerClass: decks.playerClass, format: decks.format, createdAt: decks.createdAt })
    .from(decks)
    .where(eq(decks.isDemo, false))
    .orderBy(desc(decks.id))
    .all();
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const versions = db
    .select({ id: deckVersions.id, deckId: deckVersions.deckId, versionNo: deckVersions.versionNo })
    .from(deckVersions)
    .where(inArray(deckVersions.deckId, ids))
    .orderBy(desc(deckVersions.versionNo))
    .all();
  const latest = new Map<number, number>();
  const counts = new Map<number, number>();
  for (const v of versions) {
    if (!latest.has(v.deckId)) latest.set(v.deckId, v.id);
    counts.set(v.deckId, (counts.get(v.deckId) ?? 0) + 1);
  }
  const cardRows = latest.size
    ? db.select().from(deckCards).where(inArray(deckCards.deckVersionId, [...latest.values()])).all()
    : [];
  const gameRows = db
    .select({ deckId: games.deckId, result: games.result, playedAt: games.playedAt })
    .from(games)
    .where(inArray(games.deckId, ids))
    .orderBy(asc(games.playedAt))
    .all();
  const out = rows.map((r) => {
    const v = latest.get(r.id);
    const played = gameRows.filter((g) => g.deckId === r.id);
    return {
      ...r,
      versions: counts.get(r.id) ?? 0,
      cards: cardRows.filter((c) => c.deckVersionId === v).map((c) => ({ dbfId: c.dbfId, count: c.count })),
      results: played.map((g) => g.result),
      lastPlayed: played.at(-1)?.playedAt ?? null,
    };
  });
  // The deck played most recently first; decks never played keep newest-first order below them.
  return out.sort((a, b) => (b.lastPlayed ?? "").localeCompare(a.lastPlayed ?? "") || b.id - a.id);
}

/** Constructed games (not demo data) that have no deck: played before Decks.log was on, or added by hand. */
export function countGamesWithoutDeck(): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(games)
      .where(and(isNull(games.deckId), inArray(games.mode, ["RANKED", "CASUAL", "FRIENDLY"])))
      .get()?.n ?? 0
  );
}

export type DeckDetail = DeckSummary & {
  deckstring: string;
  versionList: { id: number; versionNo: number; createdAt: string; deckstring: string; results: ("WIN" | "LOSS" | "TIE")[]; cards: { dbfId: number; count: number }[] }[];
  recent: { id: string; playedAt: string; result: "WIN" | "LOSS" | "TIE"; opponentClass: string; manual: boolean }[];
};

export function getDeck(id: number): DeckDetail | null {
  const summary = listDecks().find((d) => d.id === id);
  if (!summary) return null;
  const versionRows = db
    .select({ id: deckVersions.id, versionNo: deckVersions.versionNo, createdAt: deckVersions.createdAt, deckstring: deckVersions.deckstring })
    .from(deckVersions)
    .where(eq(deckVersions.deckId, id))
    .orderBy(desc(deckVersions.versionNo))
    .all();
  const versionCards = versionRows.length
    ? db.select().from(deckCards).where(inArray(deckCards.deckVersionId, versionRows.map((v) => v.id))).all()
    : [];
  const byVersion = db
    .select({ versionId: games.deckVersionId, result: games.result })
    .from(games)
    .where(eq(games.deckId, id))
    .all();
  const recent = db
    .select({ id: games.id, playedAt: games.playedAt, result: games.result, opponentClass: games.opponentClass, manual: games.deckManual })
    .from(games)
    .where(eq(games.deckId, id))
    .orderBy(desc(games.playedAt))
    .limit(10)
    .all();
  return {
    ...summary,
    deckstring: versionRows[0]?.deckstring ?? "",
    versionList: versionRows.map((v) => ({
      ...v,
      results: byVersion.filter((g) => g.versionId === v.id).map((g) => g.result),
      cards: versionCards.filter((c) => c.deckVersionId === v.id).map((c) => ({ dbfId: c.dbfId, count: c.count })),
    })),
    recent,
  };
}

export type DeckRef = { deckId: number; versionId: number };

/** The deck version that holds exactly this list, if any. */
export function deckVersionByDeckstring(deckstring: string): DeckRef | null {
  return db.select({ deckId: deckVersions.deckId, versionId: deckVersions.id }).from(deckVersions).where(eq(deckVersions.deckstring, deckstring)).get() ?? null;
}

/** A real (non-demo) deck of this class with this name, the newest if several. */
export function deckIdByName(name: string, playerClass: string): number | null {
  return (
    db
      .select({ id: decks.id })
      .from(decks)
      .where(and(eq(decks.name, name), eq(decks.playerClass, playerClass), eq(decks.isDemo, false)))
      .orderBy(desc(decks.id))
      .get()?.id ?? null
  );
}

/** The deck list the tracker counts down when Decks.log gave no code: the saved deck that best fits the cards seen. */
export function trackerDeckMatch(playerClass: string, seen: readonly number[]): { name: string; cards: { dbfId: number; count: number }[] } | null {
  const best = bestDeckMatch(null, seen, deckCandidates(playerClass));
  if (!best) return null;
  const name = db.select({ name: decks.name }).from(decks).where(eq(decks.id, best.deckId)).get()?.name ?? null;
  const cards = db.select({ dbfId: deckCards.dbfId, count: deckCards.count }).from(deckCards).where(eq(deckCards.deckVersionId, best.versionId)).all();
  return name ? { name, cards } : null;
}

/**
 * A deck's games that have my own card history (read from a log), with those
 * events, for card statistics. With `versionId`, only that version's games.
 */
export function deckCardGames(deckId: number, versionId?: number): (CardGame & { versionId: number | null })[] {
  const rows = db
    .select({ id: games.id, result: games.result, versionId: games.deckVersionId })
    .from(games)
    .where(and(eq(games.deckId, deckId), versionId === undefined ? undefined : eq(games.deckVersionId, versionId)))
    .all();
  if (!rows.length) return [];
  const events = new Map<string, CardGame["events"][number][]>();
  for (const e of db
    .select({ gameId: gameCardEvents.gameId, dbfId: gameCardEvents.dbfId, event: gameCardEvents.event, turn: gameCardEvents.turn })
    .from(gameCardEvents)
    .innerJoin(games, eq(games.id, gameCardEvents.gameId))
    .where(and(eq(games.deckId, deckId), eq(gameCardEvents.side, "FRIENDLY")))
    .all()) {
    events.set(e.gameId, [...(events.get(e.gameId) ?? []), e]);
  }
  return rows.flatMap((g) => {
    const list = events.get(g.id);
    return list ? [{ result: g.result, versionId: g.versionId, events: list }] : [];
  });
}
