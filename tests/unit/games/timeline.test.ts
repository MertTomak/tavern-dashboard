import { describe, expect, it } from "vitest";
import { buildTimeline, type TimelineEvent } from "@/lib/games/timeline";

const e = (side: TimelineEvent["side"], event: TimelineEvent["event"], dbfId: number, turn: number | null): TimelineEvent => ({ side, event, dbfId, turn });

describe("buildTimeline", () => {
  it("is empty without events", () => {
    expect(buildTimeline([])).toEqual({ mulligan: { kept: [], replaced: [] }, turns: [] });
  });

  it("splits the mulligan and groups each turn by side, in turn order", () => {
    const tl = buildTimeline([
      e("FRIENDLY", "MULLIGAN_KEPT", 1, 0),
      e("FRIENDLY", "MULLIGAN_REPLACED", 2, 0),
      e("FRIENDLY", "DRAWN", 3, 2),
      e("FRIENDLY", "DRAWN", 4, 1),
      e("FRIENDLY", "PLAYED", 1, 1),
      e("OPPOSING", "PLAYED", 9, 1),
    ]);
    expect(tl.mulligan).toEqual({ kept: [1], replaced: [2] });
    expect(tl.turns.map((t) => t.turn)).toEqual([1, 2]);
    expect(tl.turns[0]).toEqual({ turn: 1, you: { drew: [4], played: [1] }, opponent: { played: [9], revealed: [] } });
    expect(tl.turns[1].you.drew).toEqual([3]);
  });

  it("drops a reveal that only repeats a card the opponent played that turn", () => {
    const tl = buildTimeline([
      e("OPPOSING", "PLAYED", 9, 4),
      e("OPPOSING", "REVEALED", 9, 4),
      e("OPPOSING", "REVEALED", 9, 4),
      e("OPPOSING", "REVEALED", 7, 5),
    ]);
    expect(tl.turns[0].opponent).toEqual({ played: [9], revealed: [9] });
    expect(tl.turns[1].opponent).toEqual({ played: [], revealed: [7] });
  });

  it("ignores events without a turn", () => {
    expect(buildTimeline([e("FRIENDLY", "PLAYED", 1, null)]).turns).toEqual([]);
  });
});
