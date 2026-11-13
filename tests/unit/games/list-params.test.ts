import { describe, expect, it } from "vitest";
import { nextSort, parseGameListParams, patchQuery } from "@/lib/games-list";
import { rankIndex, rankLabel, rankParts } from "@/lib/stats/rank";

describe("games list params", () => {
  it("falls back to newest first, page 1, no filters", () => {
    expect(parseGameListParams({ sort: "luck", dir: "up", page: "-3", result: "DRAW", opp: "mage", deck: "x" })).toEqual({
      result: undefined,
      opp: undefined,
      deck: undefined,
      sort: "date",
      dir: "desc",
      page: 1,
    });
  });

  it("reads valid values", () => {
    expect(parseGameListParams({ sort: "turns", dir: "asc", page: "3", result: "WIN", opp: "MAGE", deck: "12" })).toMatchObject({ sort: "turns", dir: "asc", page: 3, result: "WIN", opp: "MAGE", deck: 12 });
    expect(parseGameListParams({ deck: "none" }).deck).toBe("none");
  });

  it("drops defaults and goes back to page 1 when a filter changes", () => {
    expect(patchQuery("range=7d&page=3", { result: "WIN" })).toBe("range=7d&result=WIN");
    expect(patchQuery("result=WIN&page=2", { result: "all" })).toBe("");
    expect(patchQuery("sort=turns", { sort: "date", dir: "desc" })).toBe("");
    expect(patchQuery("range=7d", { page: "2" })).toBe("range=7d&page=2");
  });

  it("flips the direction on the same column and starts a new column high to low", () => {
    expect(nextSort({ sort: "date", dir: "desc" }, "date")).toEqual({ sort: "date", dir: "asc" });
    expect(nextSort({ sort: "date", dir: "asc" }, "turns")).toEqual({ sort: "turns", dir: "desc" });
  });
});

describe("rank", () => {
  it("round-trips league and level", () => {
    expect(rankIndex(0, 10)).toBe(0);
    expect(rankIndex(4, 1)).toBe(49);
    expect(rankParts(23)).toEqual({ league: 2, level: 7 });
    expect(rankParts(48.6)).toEqual({ league: 4, level: 2 });
    expect(rankParts(50, 812)).toEqual({ league: "legend", legendRank: 812 });
  });

  it("labels Legend with its number when known", () => {
    expect(rankLabel(23)).toBe("Gold 7");
    expect(rankLabel(50)).toBe("Legend");
    expect(rankLabel(50, 1234)).toBe("Legend #1,234");
  });
});
