import { describe, expect, it } from "vitest";
import { buildOverviewSnapshot, currentStreak, dayKey, type OverviewGame } from "@/lib/stats/overview";
import { wilson, winRate } from "@/lib/stats/winrate";
import { classColor, classLabel, NEUTRAL_CLASS_COLOR } from "@/lib/cards/class-colors";

const TZ = "Europe/Istanbul";

function game(playedAt: string, result: OverviewGame["result"], extra: Partial<OverviewGame> = {}): OverviewGame {
  return {
    id: playedAt,
    playedAt,
    mode: "RANKED",
    result,
    playerClass: "MAGE",
    opponentClass: "WARRIOR",
    deckName: "Tempo Mage",
    rankAfter: null,
    durationSec: 300,
    ...extra,
  };
}

describe("winRate", () => {
  it("excludes ties and flags low samples", () => {
    const wr = winRate(["WIN", "LOSS", "TIE", "WIN"]);
    expect(wr).toMatchObject({ wins: 2, losses: 1, ties: 1, n: 3, lowSample: true });
    expect(wr.rate).toBeCloseTo(2 / 3);
  });

  it("returns 0 for no decided games", () => {
    expect(winRate([]).rate).toBe(0);
    expect(winRate(["TIE"]).n).toBe(0);
  });

  it("computes the Wilson interval for 5/10", () => {
    const { lower, upper } = wilson(5, 10);
    expect(lower).toBeCloseTo(0.237, 3);
    expect(upper).toBeCloseTo(0.763, 3);
  });
});

describe("overview snapshot", () => {
  it("groups days in Istanbul time (UTC 21:30 is the next day)", () => {
    expect(dayKey("2026-11-12T21:30:00Z", TZ)).toBe("2026-11-13");
  });

  it("finds the current streak, skipping ties", () => {
    const g = [game("2026-11-01T10:00:00Z", "LOSS"), game("2026-11-01T11:00:00Z", "WIN"), game("2026-11-01T12:00:00Z", "TIE"), game("2026-11-01T13:00:00Z", "WIN")];
    expect(currentStreak(g)).toEqual({ result: "WIN", length: 2 });
    expect(currentStreak([])).toBeNull();
  });

  it("splits last 7 days from the 7 before", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    const snap = buildOverviewSnapshot(
      [game("2026-11-11T12:00:00Z", "WIN"), game("2026-11-03T12:00:00Z", "LOSS"), game("2026-10-01T12:00:00Z", "WIN")],
      { now, timeZone: TZ },
    );
    expect(snap.last7.n).toBe(1);
    expect(snap.prev7.losses).toBe(1);
    expect(snap.overall.n).toBe(3);
    expect(snap.recent[0].playedAt).toBe("2026-11-11T12:00:00Z");
  });

  it("handles an empty game list", () => {
    const snap = buildOverviewSnapshot([], { now: new Date(), timeZone: TZ });
    expect(snap.overall.n).toBe(0);
    expect(snap.avgDurationSec).toBeNull();
    expect(snap.byOpponent).toEqual([]);
  });
});

describe("class colours", () => {
  it("falls back to neutral for unknown classes", () => {
    expect(classColor("MONK")).toBe(NEUTRAL_CLASS_COLOR);
    expect(classLabel("MONK")).toBe("Monk");
    expect(classLabel("DEMONHUNTER")).toBe("Demon Hunter");
  });
});
