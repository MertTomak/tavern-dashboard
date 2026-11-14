import type { TrackerView } from "@/lib/tracker/view";

/**
 * A made-up mid-game view for checking the overlay's look in a browser
 * (/overlay?demo=1) and in the design lab. Never shown in a real game.
 */
export const DEMO_VIEW: TrackerView = {
  status: "playing",
  turn: 5,
  deck: { name: "Ritual Warlock", source: "code" },
  me: {
    deckCount: 19,
    rows: [
      { cardId: "TLC_603", name: "Platysaur", cost: 1, rarity: "COMMON", total: 2, left: 1, seen: 1, drawChance: 1 / 19 },
      { cardId: "CATA_210", name: "Twilight Egg", cost: 1, rarity: "RARE", total: 2, left: 0, seen: 2, drawChance: 0 },
      { cardId: "TIME_025", name: "Floating Lessons", cost: 1, rarity: "COMMON", total: 2, left: 2, seen: 0, drawChance: 2 / 19 },
      { cardId: "BE_085", name: "Ritual of Summoning", cost: 2, rarity: "EPIC", total: 2, left: 1, seen: 1, drawChance: 1 / 19 },
      { cardId: "CORE_SCH_713", name: "Cult Neophyte", cost: 2, rarity: "RARE", total: 2, left: 2, seen: 0, drawChance: 2 / 19 },
      { cardId: "TIME_026", name: "Mawman Cultist", cost: 3, rarity: "COMMON", total: 2, left: 2, seen: 0, drawChance: 2 / 19 },
      { cardId: "JAIL_509", name: "Prison Breaker", cost: 3, rarity: "RARE", total: 1, left: 1, seen: 0, drawChance: 1 / 19 },
      { cardId: "TLC_451", name: "Zakajz the Corruptor", cost: 4, rarity: "LEGENDARY", total: 1, left: 0, seen: 1, drawChance: 0 },
      { cardId: "BE_090", name: "Abyssal Bargain", cost: 4, rarity: "COMMON", total: 2, left: 2, seen: 0, drawChance: 2 / 19 },
      { cardId: "DINO_131", name: "Bramblemaw", cost: 5, rarity: "EPIC", total: 2, left: 2, seen: 0, drawChance: 2 / 19 },
      { cardId: "TIME_702", name: "Kith'ix", cost: 6, rarity: "LEGENDARY", total: 1, left: 1, seen: 0, drawChance: 1 / 19 },
      { cardId: "CATA_496", name: "Deathwing's Shadow", cost: 8, rarity: "EPIC", total: 2, left: 2, seen: 0, drawChance: 2 / 19 },
    ],
  },
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
      { key: 41, turn: 2, cardId: "BE_726", name: "Lifebinder's Gift", cost: 2 },
      { key: 52, turn: 3, cardId: "BE_728", name: "Embrace of Nature", cost: 3 },
      { key: 60, turn: 4, cardId: null, name: null, cost: null },
      { key: 61, turn: 4, cardId: "MEND_043", name: "Healing Grove", cost: 1 },
      { key: 70, turn: 5, cardId: "BE_729", name: "Grove Keeper", cost: 4 },
    ],
  },
};
