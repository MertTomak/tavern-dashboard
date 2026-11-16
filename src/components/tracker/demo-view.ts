import { RECORDED_DECK } from "@/lib/demo/recorded-deck";
import type { DeckRow, TrackerView } from "@/lib/tracker/view";

/**
 * A made-up mid-game view for checking the tracker's look in a browser
 * (/overlay?demo=1). Never shown in a real game. Names and costs are replaced
 * from the local card data, so only the card ids matter here.
 */
const DECK = RECORDED_DECK.cards;
const DECK_COUNT = DECK.reduce((n, [, , left]) => n + left, 0);

const rows: DeckRow[] = DECK.map(([cardId, total, left, legendary]) => ({
  cardId,
  name: cardId,
  cost: null,
  rarity: legendary ? "LEGENDARY" : "COMMON",
  total,
  left,
  seen: total - left,
  drawChance: left / DECK_COUNT,
}));

export const DEMO_VIEW: TrackerView = {
  status: "playing",
  turn: 5,
  deck: { name: RECORDED_DECK.name, source: "code" },
  me: { cls: "WARLOCK", deckCount: DECK_COUNT, rows },
  opponent: {
    cls: "DRUID",
    deckCount: 21,
    handCount: 6,
    unrevealed: 1,
    rows: [
      ["EDR_469", 2],
      ["BE_726", 1],
      ["EDR_105", 1],
      ["EDR_001", 1],
      ["MEND_043", 1],
      ["EDR_470", 2],
      ["EDR_102", 1],
    ].map(([cardId, count], i) => ({ cardId: String(cardId), dbfId: 0, name: String(cardId), cost: null, rarity: "COMMON", count: Number(count), keys: [i] })),
  },
};
