import { winRate, type GameResult, type WinRate } from "./winrate";

/** Card statistics are faded below this many games (stricter than other win rates: they split thin data further). */
export const CARD_LOW_SAMPLE_N = 15;

export type CardEventKind = "MULLIGAN_KEPT" | "MULLIGAN_REPLACED" | "DRAWN" | "PLAYED";

/** One game with my own card events in it (games without a card history are left out by the caller). */
export type CardGame = { result: GameResult; events: readonly { dbfId: number; event: CardEventKind | "REVEALED"; turn: number | null }[] };

export type CardStat = {
  dbfId: number;
  /** Win rate in games where the card was offered in the mulligan and kept. */
  kept: WinRate;
  /** … offered and sent back. */
  replaced: WinRate;
  /** … in my hand at some point (kept in the mulligan, or drawn later). */
  drawn: WinRate;
  /** … never in my hand. */
  notDrawn: WinRate;
  /** … played. */
  played: WinRate;
  /** Average turn it was first played, over `played` games (ties too); null if never played. */
  avgTurn: number | null;
};

const withCardSample = (wr: WinRate): WinRate => ({ ...wr, lowSample: wr.n < CARD_LOW_SAMPLE_N });

/**
 * Per-card win rates for one deck, from my own card events. Every value is a
 * full win rate with its game count; below 15 games it is marked lowSample.
 * These are relationships, not causes: a card drawn in winning games may just
 * be drawn more in long games, for example.
 */
export function buildCardStats(games: readonly CardGame[], dbfIds: readonly number[]): CardStat[] {
  return dbfIds.map((dbfId) => {
    const kept: GameResult[] = [];
    const replaced: GameResult[] = [];
    const drawn: GameResult[] = [];
    const notDrawn: GameResult[] = [];
    const played: GameResult[] = [];
    const turns: number[] = [];
    for (const g of games) {
      const mine = g.events.filter((e) => e.dbfId === dbfId);
      const has = (kind: CardEventKind) => mine.some((e) => e.event === kind);
      if (has("MULLIGAN_KEPT")) kept.push(g.result);
      if (has("MULLIGAN_REPLACED")) replaced.push(g.result);
      if (has("MULLIGAN_KEPT") || has("DRAWN")) drawn.push(g.result);
      else notDrawn.push(g.result);
      const plays = mine.filter((e) => e.event === "PLAYED");
      if (plays.length) {
        played.push(g.result);
        turns.push(Math.min(...plays.map((e) => e.turn ?? 0)));
      }
    }
    return {
      dbfId,
      kept: withCardSample(winRate(kept)),
      replaced: withCardSample(winRate(replaced)),
      drawn: withCardSample(winRate(drawn)),
      notDrawn: withCardSample(winRate(notDrawn)),
      played: withCardSample(winRate(played)),
      avgTurn: turns.length ? turns.reduce((a, b) => a + b, 0) / turns.length : null,
    };
  });
}
