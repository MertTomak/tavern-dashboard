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
