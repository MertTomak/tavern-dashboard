import type { DeckRow, TrackerView } from "@/lib/tracker/view";

/**
 * A made-up mid-game view for checking the tracker's look in a browser
 * (/overlay?demo=1). Never shown in a real game. Names and costs are replaced
 * from the local card data, so only the card ids matter here.
 */
const DECK: [cardId: string, total: number, left: number, legendary?: boolean][] = [
  ["TLC_603", 2, 1],
  ["CATA_210", 2, 0],
  ["EDR_485", 2, 2],
  ["EDR_469", 1, 1],
  ["BE_085", 2, 1],
  ["CORE_SCH_713", 2, 2],
  ["EDR_482", 2, 1],
  ["EDR_488", 2, 2],
  ["BE_729", 2, 2],
  ["JAIL_509", 1, 1, true],
  ["DINO_410", 1, 0, true],
  ["BE_728", 1, 0, true],
  ["EDR_654", 2, 2],
  ["DINO_131", 2, 2],
  ["EDR_490", 1, 1],
  ["BE_090", 1, 1, true],
  ["EDR_487", 1, 1, true],
  ["CATA_496", 2, 2],
  ["EDR_489", 1, 1, true],
];
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
  deck: { name: "Ritual Warlock", source: "code" },
  me: { deckCount: DECK_COUNT, rows },
  opponent: {
    deckCount: 21,
    hand: [
      { slot: 1, turn: 0, coin: false, created: false },
      { slot: 2, turn: 0, coin: false, created: false },
      { slot: 3, turn: 0, coin: true, created: false },
      { slot: 4, turn: 3, coin: false, created: false },
      { slot: 5, turn: 4, coin: false, created: true },
      { slot: 6, turn: 5, coin: false, created: false },
    ],
    played: [
      { key: 30, turn: 1, cardId: "EDR_469", name: null, cost: null },
      { key: 41, turn: 2, cardId: "BE_726", name: null, cost: null },
      { key: 42, turn: 2, cardId: "EDR_105", name: null, cost: null },
      { key: 52, turn: 3, cardId: "EDR_001", name: null, cost: null },
      { key: 60, turn: 4, cardId: null, name: null, cost: null },
      { key: 61, turn: 4, cardId: "MEND_043", name: null, cost: null },
      { key: 62, turn: 4, cardId: "EDR_470", name: null, cost: null },
      { key: 70, turn: 5, cardId: "EDR_102", name: null, cost: null },
      { key: 71, turn: 5, cardId: "EDR_469", name: null, cost: null },
    ],
  },
};
