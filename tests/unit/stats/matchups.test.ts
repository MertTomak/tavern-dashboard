import { describe, expect, it } from "vitest";
import { buildMatchups, type MatchupGame } from "@/lib/stats/matchups";

const g = (deckId: number | null, deckName: string | null, playerClass: string, opponentClass: string, result: MatchupGame["result"], archetype: [number, string] | null = null): MatchupGame => ({
  deckId,
  deckName,
  playerClass,
  opponentClass,
  result,
  opponentArchetypeId: archetype?.[0] ?? null,
  opponentArchetype: archetype?.[1] ?? null,
});

const GAMES: MatchupGame[] = [
  g(1, "Yogg Warrior", "WARRIOR", "PALADIN", "WIN"),
  g(1, "Yogg Warrior", "WARRIOR", "PALADIN", "WIN"),
  g(1, "Yogg Warrior", "WARRIOR", "MAGE", "LOSS"),
  g(1, "Yogg Warrior", "WARRIOR", "MAGE", "TIE"),
  g(2, "Ritual Warlock", "WARLOCK", "PALADIN", "LOSS"),
  g(null, null, "WARLOCK", "DRUID", "WIN"),
  g(null, null, "WARRIOR", "DRUID", "LOSS"),
];

describe("buildMatchups", () => {
  it("is empty without games", () => {
    expect(buildMatchups([], "deck")).toMatchObject({ columns: [], rows: [], totals: {}, overall: { n: 0, rate: 0 } });
  });

  it("splits my decks against each opponent class, most played first", () => {
    const m = buildMatchups(GAMES, "deck");
    expect(m.columns).toEqual(["PALADIN", "DRUID", "MAGE"]);
    expect(m.rows.map((r) => r.deckName)).toEqual(["Yogg Warrior", "Ritual Warlock", null, null]);
    const yogg = m.rows[0];
    expect(yogg.cells.PALADIN).toMatchObject({ wins: 2, losses: 0, n: 2, rate: 1, lowSample: true });
    // A tie is shown but never counts toward the rate.
    expect(yogg.cells.MAGE).toMatchObject({ wins: 0, losses: 1, ties: 1, n: 1, rate: 0 });
    expect(yogg.cells.DRUID).toBeUndefined();
    expect(yogg.total).toMatchObject({ wins: 2, losses: 1, n: 3 });
  });

  it("keeps games without a deck apart per class", () => {
    const m = buildMatchups(GAMES, "deck");
    const none = m.rows.filter((r) => r.deckName === null);
    expect(none.map((r) => r.cls).sort()).toEqual(["WARLOCK", "WARRIOR"]);
  });

  it("groups by my class when asked", () => {
    const m = buildMatchups(GAMES, "class");
    expect(m.rows.map((r) => r.key)).toEqual(["WARRIOR", "WARLOCK"]);
    expect(m.rows[1].cells.PALADIN).toMatchObject({ wins: 0, losses: 1 });
    expect(m.rows[1].cells.DRUID).toMatchObject({ wins: 1, losses: 0 });
    expect(m.totals.PALADIN).toMatchObject({ wins: 2, losses: 1, n: 3 });
    expect(m.overall).toMatchObject({ wins: 3, losses: 3, ties: 1 });
  });

  it("marks a cell with 10 decided games as a full sample", () => {
    const ten = Array.from({ length: 10 }, (_, i) => g(1, "Deck", "MAGE", "ROGUE", i < 6 ? "WIN" : "LOSS"));
    expect(buildMatchups(ten, "deck").rows[0].cells.ROGUE).toMatchObject({ n: 10, lowSample: false, rate: 0.6 });
    expect(buildMatchups(ten.slice(1), "deck").rows[0].cells.ROGUE.lowSample).toBe(true);
  });

  it("splits columns by opponent archetype, unknown ones per class", () => {
    const aggro: [number, string] = [7, "Aggro Paladin"];
    const games = [g(1, "Zoo", "WARLOCK", "PALADIN", "WIN", aggro), g(1, "Zoo", "WARLOCK", "PALADIN", "LOSS", aggro), g(1, "Zoo", "WARLOCK", "PALADIN", "WIN"), g(1, "Zoo", "WARLOCK", "MAGE", "LOSS")];
    const m = buildMatchups(games, "deck", "archetype");
    expect(m.columns).toEqual(["7", "unknown:MAGE", "unknown:PALADIN"]);
    expect(m.columnInfo["7"]).toEqual({ key: "7", cls: "PALADIN", archetype: "Aggro Paladin" });
    expect(m.columnInfo["unknown:PALADIN"]).toEqual({ key: "unknown:PALADIN", cls: "PALADIN", archetype: null });
    expect(m.rows[0].cells["7"]).toMatchObject({ wins: 1, losses: 1 });
    expect(m.totals["unknown:PALADIN"]).toMatchObject({ wins: 1, losses: 0 });
    // Class columns are unchanged by archetypes.
    expect(buildMatchups(games, "deck").columns).toEqual(["PALADIN", "MAGE"]);
  });
});
