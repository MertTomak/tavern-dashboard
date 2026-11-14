import type { CardIndex } from "@/lib/cards/all-cards";
import type { TrackedEntity, TrackerGame } from "./game";

/**
 * What the overlay shows, built from the live game. This is the fair-play
 * boundary: only what the player can see in the game itself.
 * - My deck: my list minus my own cards that have left the deck (I saw them).
 * - Opponent's hand: card backs only, never an identity, even when the log has one;
 *   just the turn each card arrived, The Coin, and whether it was created.
 * - Opponent's plays: a card's face only once it has been in play, the graveyard or
 *   removed from game; an unrevealed secret stays a secret.
 * - Counts (deck sizes) are on screen in the game too.
 */

export type DeckListCard = { dbfId: number; count: number };
/** The deck the tracker counts down: from Decks.log ("code") or matched against a saved deck ("match"). */
export type TrackerDeck = { name: string | null; source: "code" | "match"; cards: DeckListCard[] };

export type DeckRow = {
  cardId: string;
  name: string;
  cost: number | null;
  rarity: string | null;
  /** Copies in the list; null when only the cards seen so far are known. */
  total: number | null;
  /** Copies still in the deck (null without a list), or copies seen (without a list). */
  left: number | null;
  seen: number;
  /** Chance the next draw is this card (0–1); null without a list. */
  drawChance: number | null;
};
export type HandCard = { slot: number; turn: number; coin: boolean; created: boolean };
export type PlayedRow = { key: number; turn: number; cardId: string | null; name: string | null; cost: number | null };

export type TrackerView = {
  status: "waiting" | "playing" | "over";
  turn: number;
  deck: { name: string | null; source: TrackerDeck["source"] | "seen" };
  me: { deckCount: number; rows: DeckRow[] };
  opponent: { deckCount: number; hand: HandCard[]; played: PlayedRow[] };
};

export const EMPTY_VIEW: TrackerView = {
  status: "waiting",
  turn: 0,
  deck: { name: null, source: "seen" },
  me: { deckCount: 0, rows: [] },
  opponent: { deckCount: 0, hand: [], played: [] },
};

/** Started in the player's deck or opening hand (not created during the game; The Coin never did). */
const fromDeck = (e: TrackedEntity) => e.createdInSetup && !e.isCoin && (e.firstZone === "DECK" || e.firstZone === "HAND");

const byCost = (a: DeckRow, b: DeckRow) => (a.cost ?? 99) - (b.cost ?? 99) || a.name.localeCompare(b.name);

export function buildTrackerView(game: TrackerGame | null, deck: TrackerDeck | null, cards: CardIndex): TrackerView {
  if (!game || game.friendlyPlayerId === null) return { ...EMPTY_VIEW, deck: { name: deck?.name ?? null, source: deck?.source ?? "seen" } };
  const me = game.friendlyPlayerId;
  const them = game.opponentPlayerId;
  const all = [...game.entities.values()];
  const mine = all.filter((e) => e.controller === me);
  const theirs = all.filter((e) => them !== null && e.controller === them);

  // My cards that started in my deck and that I have seen leave it (drawn, played, discarded …).
  const seen = new Map<number, number>();
  for (const e of mine) {
    if (!fromDeck(e) || !e.firstCardId || e.zone === "DECK") continue;
    const dbf = cards.byId(e.firstCardId)?.dbfId;
    if (dbf) seen.set(dbf, (seen.get(dbf) ?? 0) + 1);
  }
  const deckCount = mine.filter((e) => e.zone === "DECK").length;

  let rows: DeckRow[];
  if (deck) {
    rows = deck.cards.flatMap(({ dbfId, count }) => {
      const c = cards.byDbf(dbfId);
      if (!c) return [];
      const used = seen.get(dbfId) ?? 0;
      const left = Math.max(0, count - used);
      return [{ cardId: c.id, name: c.name, cost: c.cost ?? null, rarity: c.rarity ?? null, total: count, left, seen: used, drawChance: deckCount ? left / deckCount : 0 }];
    });
  } else {
    rows = [...seen.entries()].flatMap(([dbfId, n]) => {
      const c = cards.byDbf(dbfId);
      return c ? [{ cardId: c.id, name: c.name, cost: c.cost ?? null, rarity: c.rarity ?? null, total: null, left: null, seen: n, drawChance: null }] : [];
    });
  }

  const hand: HandCard[] = theirs
    .filter((e) => e.zone === "HAND")
    .sort((a, b) => a.handPos - b.handPos || a.id - b.id)
    .map((e, i) => ({ slot: i + 1, turn: e.handTurn ?? 0, coin: e.isCoin, created: !e.isCoin && !fromDeck(e) }));

  const played: PlayedRow[] = game.opponentPlayed.map((p) => {
    const e = game.entities.get(p.entityId);
    const visible = !!e && e.wasPublic && e.zone !== "SECRET" && !!e.cardId;
    const c = visible && e ? cards.byId(e.cardId) : undefined;
    return { key: p.entityId, turn: p.turn, cardId: c ? c.id : null, name: c?.name ?? null, cost: c?.cost ?? null };
  });

  return {
    status: game.complete ? "over" : "playing",
    turn: game.mainStarted ? game.turn : 0,
    deck: { name: deck?.name ?? null, source: deck?.source ?? "seen" },
    me: { deckCount, rows: rows.sort(byCost) },
    opponent: { deckCount: theirs.filter((e) => e.zone === "DECK").length, hand, played },
  };
}
