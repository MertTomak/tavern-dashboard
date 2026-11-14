import { describe, expect, it } from "vitest";
import { buildSessions, winRateByGameNumber, type SessionGame } from "@/lib/stats/sessions";

const game = (playedAt: string, result: SessionGame["result"], durationSec: number | null = 600, deckName: string | null = "Yogg Warrior"): SessionGame => ({
  id: playedAt,
  playedAt,
  result,
  durationSec,
  deckName,
  playerClass: "WARRIOR",
  opponentClass: "MAGE",
});

describe("buildSessions", () => {
  it("is empty without games", () => {
    expect(buildSessions([])).toEqual([]);
    expect(winRateByGameNumber([])).toEqual([]);
  });

  it("makes one session of a single game", () => {
    const [s] = buildSessions([game("2026-11-14T12:00:00.000Z", "WIN", 420)]);
    expect(s).toMatchObject({ start: "2026-11-14T12:00:00.000Z", end: "2026-11-14T12:07:00.000Z", durationSec: 420, wr: { wins: 1, n: 1 } });
  });

  it("splits on a break longer than 30 minutes, measured from the end of the previous game", () => {
    const sessions = buildSessions([
      game("2026-11-14T12:00:00.000Z", "WIN", 600), // ends 12:10
      game("2026-11-14T12:40:00.000Z", "LOSS", 600), // exactly 30 min after the end: same session
      game("2026-11-14T13:20:01.000Z", "WIN", 300), // 30 min 1 s after 12:50: new session
    ]);
    expect(sessions.map((s) => s.games.length)).toEqual([2, 1]);
    expect(sessions[0]).toMatchObject({ durationSec: 50 * 60, wr: { wins: 1, losses: 1 } });
  });

  it("sorts unsorted games and treats an unknown length as zero", () => {
    const sessions = buildSessions([game("2026-11-14T12:31:00.000Z", "LOSS", null), game("2026-11-14T12:00:00.000Z", "WIN", null)]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].games[0].result).toBe("WIN");
    expect(sessions[1].end).toBe("2026-11-14T12:31:00.000Z");
  });

  it("keeps a session together across midnight", () => {
    const sessions = buildSessions([game("2026-11-14T20:50:00.000Z", "WIN"), game("2026-11-14T21:05:00.000Z", "WIN")]);
    expect(sessions).toHaveLength(1);
  });

  it("lists the decks used, most played first", () => {
    const [s] = buildSessions([
      game("2026-11-14T12:00:00.000Z", "WIN", 60, "A"),
      game("2026-11-14T12:05:00.000Z", "WIN", 60, null),
      game("2026-11-14T12:10:00.000Z", "LOSS", 60, null),
    ]);
    expect(s.decks).toEqual([{ name: null, games: 2 }, { name: "A", games: 1 }]);
  });

  it("counts ties in a session but not in its win rate", () => {
    const [s] = buildSessions([game("2026-11-14T12:00:00.000Z", "TIE"), game("2026-11-14T12:12:00.000Z", "WIN")]);
    expect(s.wr).toMatchObject({ wins: 1, losses: 0, ties: 1, n: 1, rate: 1 });
  });
});

describe("winRateByGameNumber", () => {
  it("gives the win rate of each position across sessions", () => {
    const sessions = buildSessions([
      game("2026-11-13T12:00:00.000Z", "WIN"),
      game("2026-11-13T12:12:00.000Z", "LOSS"),
      game("2026-11-13T12:24:00.000Z", "LOSS"),
      game("2026-11-14T12:00:00.000Z", "WIN"),
      game("2026-11-14T12:12:00.000Z", "WIN"),
    ]);
    const byNumber = winRateByGameNumber(sessions);
    expect(byNumber.map((p) => p.gameNumber)).toEqual([1, 2, 3]);
    expect(byNumber[0].wr).toMatchObject({ wins: 2, losses: 0, rate: 1 });
    expect(byNumber[1].wr).toMatchObject({ wins: 1, losses: 1, rate: 0.5 });
    expect(byNumber[2].wr).toMatchObject({ wins: 0, losses: 1, n: 1, lowSample: true });
  });
});
