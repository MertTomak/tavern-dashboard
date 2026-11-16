import type { CardIndex } from "@/lib/cards/all-cards";
import type { TrackedEntity, TrackerGame } from "./game";

/**
 * What the overlay shows, built from the live game. This is the fair-play
 * boundary: only what the player can see in the game itself.
 * - My deck: my list minus my own cards that have left the deck (I saw them).
 * - Opponent: a list of the cards they have played or revealed, grouped like a
 *   deck list. A card is listed only once its face has been in play, the
 *   graveyard or removed from game; an unrevealed secret is only counted.
 *   Nothing about their hand except its size, even when the log names a card.
 * - Counts (hand and deck sizes) and both classes are on screen in the game too.
 */

export type DeckListCard = { dbfId: number; count: number };
/** The deck the tracker counts down: from Decks.log ("code"), picked by the user ("picked") or matched against a saved deck ("match"). */
export type TrackerDeck = { name: string | null; source: "code" | "picked" | "match"; cards: DeckListCard[] };

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
/** One card the opponent has played or revealed, with how many copies were seen. `keys` are the log entities behind it. */
export type OpponentRow = { cardId: string; name: string; cost: number | null; rarity: string | null; count: number; keys: number[] };

export type TrackerView = {
  status: "waiting" | "playing" | "over";
  turn: number;
  deck: { name: string | null; source: TrackerDeck["source"] | "seen" };
  /** `cls` is my hero's class (null until the heroes are known). */
  me: { cls: string | null; deckCount: number; rows: DeckRow[] };
  /** `unrevealed`: cards they played whose face has not been shown yet (secrets). */
  opponent: { cls: string | null; deckCount: number; handCount: number; rows: OpponentRow[]; unrevealed: number };
};

export const EMPTY_VIEW: TrackerView = {
  status: "waiting",
  turn: 0,
  deck: { name: null, source: "seen" },
  me: { cls: null, deckCount: 0, rows: [] },
  opponent: { cls: null, deckCount: 0, handCount: 0, rows: [], unrevealed: 0 },
};

/** Started in the player's deck or opening hand (not created during the game; The Coin never did). */
const fromDeck = (e: TrackedEntity) => e.createdInSetup && !e.isCoin && (e.firstZone === "DECK" || e.firstZone === "HAND");

/** Class of a player's hero (the first hero entity they control; hero cards played later do not change it). */
export function heroClass(game: TrackerGame, playerId: number | null, cards: CardIndex): string | null {
  if (playerId === null) return null;
  const hero = [...game.entities.values()].filter((e) => e.cardType === "HERO" && e.controller === playerId && e.cardId).sort((a, b) => a.id - b.id)[0];
  return (hero && cards.byId(hero.cardId)?.cardClass) ?? null;
}

const byCost = (a: { cost: number | null; name: string }, b: { cost: number | null; name: string }) => (a.cost ?? 99) - (b.cost ?? 99) || a.name.localeCompare(b.name);

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

  // Opponent's cards with a public face: the ones they played, and cards from their deck or hand
  // that were shown some other way (discarded, burned, pulled into play).
  const NOT_CARDS = new Set(["HERO", "HERO_POWER"]);
  const publicFace = (e: TrackedEntity | undefined): e is TrackedEntity => !!e && e.wasPublic && e.zone !== "SECRET" && !!e.cardId;
  const played = new Set(game.opponentPlayed);
  const revealed = theirs.filter((e) => !played.has(e.id) && fromDeck(e) && !NOT_CARDS.has(e.cardType ?? "") && publicFace(e));
  const shown = [...game.opponentPlayed.map((id) => game.entities.get(id)).filter(publicFace), ...revealed];
  const groups = new Map<string, OpponentRow>();
  for (const e of shown) {
    const c = cards.byId(e.cardId);
    if (!c) continue;
    const row = groups.get(c.id) ?? { cardId: c.id, name: c.name, cost: c.cost ?? null, rarity: c.rarity ?? null, count: 0, keys: [] };
    row.count++;
    row.keys.push(e.id);
    groups.set(c.id, row);
  }
  const unrevealed = game.opponentPlayed.filter((id) => !publicFace(game.entities.get(id))).length;

  return {
    status: game.complete ? "over" : "playing",
    turn: game.mainStarted ? game.turn : 0,
    deck: { name: deck?.name ?? null, source: deck?.source ?? "seen" },
    me: { cls: heroClass(game, me, cards), deckCount, rows: rows.sort(byCost) },
    opponent: {
      cls: heroClass(game, them, cards),
      deckCount: theirs.filter((e) => e.zone === "DECK").length,
      handCount: theirs.filter((e) => e.zone === "HAND").length,
      rows: [...groups.values()].sort(byCost),
      unrevealed,
    },
  };
}
