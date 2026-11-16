import { describe, expect, it } from "vitest";
import { buildCardStats, CARD_LOW_SAMPLE_N, type CardGame } from "@/lib/stats/cards";

type E = CardGame["events"][number];
const ev = (dbfId: number, event: E["event"], turn: number | null = 1): E => ({ dbfId, event, turn });
const game = (result: CardGame["result"], ...events: E[]): CardGame => ({ result, events });

describe("buildCardStats", () => {
  it("is empty-safe", () => {
    expect(buildCardStats([], [1])[0]).toMatchObject({ dbfId: 1, kept: { n: 0 }, drawn: { n: 0 }, notDrawn: { n: 0 }, avgTurn: null });
    expect(buildCardStats([game("WIN")], [])).toEqual([]);
  });

  it("splits kept, replaced, drawn, not drawn and played", () => {
    const games = [
      game("WIN", ev(1, "MULLIGAN_KEPT", 0), ev(1, "PLAYED", 2)),
      game("LOSS", ev(1, "MULLIGAN_REPLACED", 0)),
      game("WIN", ev(1, "MULLIGAN_REPLACED", 0), ev(1, "DRAWN", 4), ev(1, "PLAYED", 5), ev(1, "PLAYED", 7)),
      game("LOSS", ev(2, "DRAWN", 1)),
      game("TIE", ev(1, "DRAWN", 3), ev(1, "PLAYED", 3)),
    ];
    const [s] = buildCardStats(games, [1]);
    expect(s.kept).toMatchObject({ wins: 1, losses: 0 });
    expect(s.replaced).toMatchObject({ wins: 1, losses: 1 });
    // Drawn: kept in game 1, drawn later in game 3 (after a replace), drawn in game 5 (tie).
    expect(s.drawn).toMatchObject({ wins: 2, losses: 0, ties: 1 });
    expect(s.notDrawn).toMatchObject({ wins: 0, losses: 2 });
    expect(s.played).toMatchObject({ wins: 2, losses: 0, ties: 1 });
    // First play per game: 2, 5, 3.
    expect(s.avgTurn).toBeCloseTo(10 / 3);
  });

  it(`fades below ${CARD_LOW_SAMPLE_N} games`, () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => game(i % 2 ? "WIN" : "LOSS", ev(1, "DRAWN")));
    expect(buildCardStats(many(14), [1])[0].drawn.lowSample).toBe(true);
    expect(buildCardStats(many(15), [1])[0].drawn.lowSample).toBe(false);
  });
});
