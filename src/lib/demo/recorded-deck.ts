/**
 * The Warlock deck played in the recorded fixture games
 * (tests/fixtures/power-logs/): card id, copies in the list, copies still in
 * the deck in the made-up tracker view (/overlay?demo=1), legendary.
 * The demo dataset uses it as the newest version of its Warlock deck, and the
 * replay counts it down like the tracker does with a deck from Decks.log.
 */
export const RECORDED_DECK: { name: string; cards: readonly [cardId: string, total: number, left: number, legendary?: boolean][] } = {
  name: "Ritual Warlock",
  cards: [
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
  ],
};
