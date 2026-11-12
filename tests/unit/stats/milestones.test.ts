import { describe, expect, it } from "vitest";
import { findMilestones } from "@/lib/stats/milestones";
import type { OverviewGame } from "@/lib/stats/overview";

let n = 0;
function g(result: OverviewGame["result"], extra: Partial<OverviewGame> = {}): OverviewGame {
  n++;
  return {
    id: `g${n}`,
    playedAt: `2026-11-01T${String(n).padStart(2, "0")}:00:00Z`,
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

describe("milestones", () => {
  it("marks new leagues and Legend only the first time", () => {
    n = 0;
    const games = [g("WIN", { rankAfter: 18 }), g("WIN", { rankAfter: 20 }), g("LOSS", { rankAfter: 19 }), g("WIN", { rankAfter: 20 }), g("WIN", { rankAfter: 50 }), g("LOSS", { rankAfter: 49 }), g("WIN", { rankAfter: 50 })];
    const m = findMilestones(games);
    expect(m.filter((x) => x.kind === "league").map((x) => x.gameId)).toEqual(["g2"]);
    expect(m.filter((x) => x.kind === "legend").map((x) => x.gameId)).toEqual(["g5"]);
  });

  it("marks the first game of each new deck, but not the very first game", () => {
    n = 0;
    const m = findMilestones([g("WIN"), g("WIN", { deckName: "Zoo Warlock" }), g("LOSS", { deckName: "Tempo Mage" })]);
    expect(m.filter((x) => x.kind === "newDeck").map((x) => x.gameId)).toEqual(["g2"]);
  });

  it("marks the end of the longest win streak (3 or more), ignoring ties", () => {
    n = 0;
    const m = findMilestones([g("WIN"), g("WIN"), g("TIE"), g("WIN"), g("LOSS"), g("WIN"), g("WIN")]);
    expect(m.find((x) => x.kind === "longestStreak")).toMatchObject({ gameId: "g4", length: 3 });
    n = 0;
    expect(findMilestones([g("WIN"), g("WIN"), g("LOSS")]).some((x) => x.kind === "longestStreak")).toBe(false);
  });
});
