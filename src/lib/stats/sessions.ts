import { winRate, type GameResult, type WinRate } from "./winrate";

export type SessionGame = {
  id: string;
  playedAt: string; // UTC ISO-8601, when the game started
  result: GameResult;
  durationSec: number | null;
  deckName: string | null;
  playerClass: string;
  opponentClass: string;
};

export type Session = {
  /** The first game's id. */
  id: string;
  start: string;
  /** End of the last game (its start, if its length is unknown). */
  end: string;
  durationSec: number;
  games: SessionGame[];
  wr: WinRate;
  /** Decks used, most played first; null = games without a deck. */
  decks: { name: string | null; games: number }[];
};

/** A new session starts after a break longer than this. */
export const SESSION_GAP_MIN = 30;

const endMs = (g: SessionGame) => new Date(g.playedAt).getTime() + (g.durationSec ?? 0) * 1000;

/**
 * Groups games into play sessions: consecutive games with no break longer
 * than `gapMin` minutes between the end of one and the start of the next.
 * Returns sessions oldest first; games inside keep their order.
 */
export function buildSessions(games: readonly SessionGame[], gapMin = SESSION_GAP_MIN): Session[] {
  const sorted = [...games].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const groups: SessionGame[][] = [];
  for (const g of sorted) {
    const current = groups[groups.length - 1];
    const prev = current?.[current.length - 1];
    if (prev && new Date(g.playedAt).getTime() - endMs(prev) <= gapMin * 60_000) current.push(g);
    else groups.push([g]);
  }
  return groups.map((list) => {
    const first = list[0];
    const last = list[list.length - 1];
    const deckCounts = new Map<string | null, number>();
    for (const g of list) deckCounts.set(g.deckName, (deckCounts.get(g.deckName) ?? 0) + 1);
    return {
      id: first.id,
      start: first.playedAt,
      end: new Date(endMs(last)).toISOString(),
      durationSec: Math.round((endMs(last) - new Date(first.playedAt).getTime()) / 1000),
      games: list,
      wr: winRate(list.map((g) => g.result)),
      decks: [...deckCounts.entries()].map(([name, n]) => ({ name, games: n })).sort((a, b) => b.games - a.games || (a.name ?? "").localeCompare(b.name ?? "")),
    };
  });
}

/** Win rate of the 1st, 2nd, 3rd … game of a session, across all sessions. Positions nobody reached are absent. */
export function winRateByGameNumber(sessions: readonly Session[]): { gameNumber: number; wr: WinRate }[] {
  const byNumber: GameResult[][] = [];
  for (const s of sessions) s.games.forEach((g, i) => (byNumber[i] ??= []).push(g.result));
  return byNumber.map((results, i) => ({ gameNumber: i + 1, wr: winRate(results) }));
}
