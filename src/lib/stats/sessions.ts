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

/** Losses in a row in one session that start a tilt warning. */
export const TILT_LOSSES = 3;
/** Session win rate at least this far below the overall one (0.10 = 10 points). */
export const TILT_GAP = 0.1;

export type Tilt = {
  /** Longest run of losses in the session: index of its first game and its length. */
  run: { start: number; length: number };
  /** Overall win rate minus the session's (0–1). */
  gap: number;
};

/** Longest run of losses in a row (ties break a run), with where it starts. */
export function longestLossRun(results: readonly GameResult[]): { start: number; length: number } {
  let best = { start: 0, length: 0 };
  let start = 0;
  results.forEach((r, i) => {
    if (r !== "LOSS") {
      start = i + 1;
      return;
    }
    if (i - start + 1 > best.length) best = { start, length: i - start + 1 };
  });
  return best;
}

/**
 * Tilt warning for one session: 3+ losses in a row and a session win rate at
 * least 10 points below the overall one. Silent when the overall win rate rests
 * on too few games to be an average worth comparing with (low sample).
 */
export function sessionTilt(session: Session, overall: WinRate): Tilt | null {
  if (overall.lowSample || !session.wr.n) return null;
  const run = longestLossRun(session.games.map((g) => g.result));
  const gap = overall.rate - session.wr.rate;
  return run.length >= TILT_LOSSES && gap >= TILT_GAP - 1e-9 ? { run, gap } : null;
}
