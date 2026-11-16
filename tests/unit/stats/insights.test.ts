import { describe, expect, it } from "vitest";
import { buildInsights, INSIGHT_MIN_N, MAX_INSIGHTS, type InsightGame } from "@/lib/stats/insights";

const NOW = new Date("2026-11-17T12:00:00Z");
const opts = { now: NOW, timeZone: "Europe/Istanbul", classLabel: (c: string) => c.charAt(0) + c.slice(1).toLowerCase() };
const OLD = "2026-10-20T15:00:00Z"; // 18:00 in Istanbul, well before the last 7 days

const g = (result: InsightGame["result"], p: Partial<InsightGame> = {}): InsightGame => ({
  playedAt: OLD,
  result,
  opponentClass: "MAGE",
  opponentArchetype: null,
  wentFirst: null,
  deckId: null,
  deckName: null,
  versionNo: null,
  ...p,
});
const many = (n: number, wins: number, p: Partial<InsightGame> = {}) => Array.from({ length: n }, (_, i) => g(i < wins ? "WIN" : "LOSS", p));

describe("buildInsights", () => {
  it("stays quiet with no games and says how many more are needed", () => {
    expect(buildInsights([], opts)).toMatchObject({ insights: [], status: "needMore", needed: 2 * INSIGHT_MIN_N });
    expect(buildInsights(many(25, 12), opts)).toMatchObject({ status: "needMore", needed: 15 });
  });

  it("needs 20 games on each side of the coin comparison (19 is not enough)", () => {
    const at = (n: number) => [...many(n, n, { wentFirst: true }), ...many(n, 0, { wentFirst: false })];
    expect(buildInsights(at(19), opts).insights.find((i) => i.id === "coin")).toBeUndefined();
    const coin = buildInsights(at(20), opts).insights.find((i) => i.id === "coin");
    expect(coin).toMatchObject({ severity: "info", n: 40 });
    expect(coin?.text).toBe("You win 100% going first vs 0% on the coin (n=20 / n=20).");
  });

  it("says nothing when the ranges overlap", () => {
    const games = [...many(30, 16, { wentFirst: true }), ...many(30, 14, { wentFirst: false })];
    const r = buildInsights(games, opts);
    expect(r.insights).toEqual([]);
    expect(r.status).toBe("noPattern");
  });

  it("names the toughest and easiest matchup against the rest", () => {
    const games = [...many(24, 5, { opponentClass: "WARRIOR" }), ...many(24, 21, { opponentClass: "PRIEST" }), ...many(60, 30, { opponentClass: "MAGE" })];
    const r = buildInsights(games, opts);
    const tough = r.insights.find((i) => i.id === "toughest:WARRIOR");
    expect(tough?.severity).toBe("warn");
    expect(tough?.text).toMatch(/^Against Warrior you win 20.8% \(n=24\), your toughest matchup/);
    expect(r.insights.find((i) => i.id === "easiest:PRIEST")?.severity).toBe("good");
    // Warnings come first.
    expect(r.insights[0].severity).toBe("warn");
  });

  it("compares the last 7 days with before, and deck versions", () => {
    const recent = "2026-11-15T15:00:00Z";
    const games = [...many(25, 22, { playedAt: recent, deckId: 1, deckName: "Zoo", versionNo: 2 }), ...many(25, 6, { deckId: 1, deckName: "Zoo", versionNo: 1 })];
    const ids = buildInsights(games, opts).insights.map((i) => i.id);
    expect(ids).toContain("trend");
    expect(ids).toContain("version:1");
  });

  it(`never returns more than ${MAX_INSIGHTS}`, () => {
    const recent = "2026-11-15T03:00:00Z"; // 06:00 Istanbul: morning
    const games = [
      ...many(30, 28, { playedAt: recent, wentFirst: true, opponentClass: "PRIEST", deckId: 1, versionNo: 2, deckName: "Zoo" }),
      ...many(30, 3, { wentFirst: false, opponentClass: "WARRIOR", deckId: 1, versionNo: 1, deckName: "Zoo" }),
      ...many(40, 20, { opponentClass: "MAGE", opponentArchetype: "Spell Mage" }),
    ];
    expect(buildInsights(games, opts).insights.length).toBeLessThanOrEqual(MAX_INSIGHTS);
  });
});
