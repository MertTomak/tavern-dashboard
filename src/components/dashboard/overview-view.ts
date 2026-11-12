import type { OverviewSnapshot } from "@/lib/stats/overview";
import { classLabel } from "@/lib/cards/class-colors";
import { formatNumber, formatPercent, formatPointsDelta, formatShortDateTime } from "@/lib/format";
import { LEGEND_INDEX, rankLabel } from "@/lib/stats/rank";
import type { GameResult } from "@/lib/stats/winrate";
import { t } from "@/i18n";

/** Plain, serialisable data for the client components (no functions, no Dates). */

export type ChartPoint = { x: number; y: number; tip: string[] };

export type RecentGameView = {
  id: string;
  result: GameResult;
  opponent: string;
  opponentClass: string;
  when: string;
};

export type ScoreboardView = {
  winRate: number;
  games: string;
  wins: number;
  losses: number;
  last7: number | null;
  last7n: string;
  delta: string;
  deltaUp: boolean;
  streak: string;
  streakResult: GameResult | null;
  avgDurationSec: number | null;
  form: RecentGameView[]; // oldest -> newest
  mainClass: string | null; // the class you played most in this range
};

export type StandingView = {
  cls: string;
  label: string;
  rate: number;
  wins: number;
  losses: number;
  n: number;
  lowSample: boolean;
};

export type SignatureCard = { id: string; name: string };

export type DeckView = StandingView & { name: string; signature: SignatureCard | null };

export function recentView(s: OverviewSnapshot): RecentGameView[] {
  return s.recent.map((g) => ({
    id: g.id,
    result: g.result,
    opponent: classLabel(g.opponentClass),
    opponentClass: g.opponentClass,
    when: formatShortDateTime(g.playedAt),
  }));
}

export function scoreboardView(s: OverviewSnapshot): ScoreboardView {
  const streak = s.streak
    ? s.streak.result === "WIN"
      ? t.overview.streakWins(s.streak.length)
      : t.overview.streakLosses(s.streak.length)
    : t.overview.noStreak;
  const hasPrev = s.prev7.n > 0 && s.last7.n > 0;
  return {
    winRate: s.overall.rate,
    games: t.overview.games(formatNumber(s.overall.n + s.overall.ties)),
    wins: s.overall.wins,
    losses: s.overall.losses,
    last7: s.last7.n ? s.last7.rate : null,
    last7n: t.overview.n(formatNumber(s.last7.n)),
    delta: hasPrev ? t.overview.vsPrev(formatPointsDelta(s.last7.rate - s.prev7.rate)) : t.overview.noPrevWeek,
    deltaUp: s.last7.rate >= s.prev7.rate,
    streak,
    streakResult: s.streak?.result ?? null,
    avgDurationSec: s.avgDurationSec,
    form: [...recentView(s)].reverse(),
    mainClass: s.mainClass,
  };
}

/** Opponent classes ranked by win rate (a real order, hence positions). */
export function standingsView(s: OverviewSnapshot): StandingView[] {
  return s.byOpponent
    .map((o) => ({
      cls: o.cls,
      label: classLabel(o.cls),
      rate: o.wr.rate,
      wins: o.wr.wins,
      losses: o.wr.losses,
      n: o.wr.n,
      lowSample: o.wr.lowSample,
    }))
    .sort((a, b) => b.rate - a.rate || b.n - a.n);
}

export function decksView(s: OverviewSnapshot, signatures: ReadonlyMap<string, SignatureCard>): DeckView[] {
  return s.byDeck.map((d) => ({
    name: d.name,
    signature: signatures.get(d.name) ?? null,
    cls: d.cls,
    label: classLabel(d.cls),
    rate: d.wr.rate,
    wins: d.wr.wins,
    losses: d.wr.losses,
    n: d.wr.n,
    lowSample: d.wr.lowSample,
  }));
}

/** Skips the first games, where the window is not yet full and the line only jumps around. */
export function rollingPoints(s: OverviewSnapshot, window: number): ChartPoint[] {
  const minN = Math.min(window, s.overall.n);
  return s.rolling
    .filter((p) => p.n >= minN)
    .map((p) => ({
      x: p.index,
      y: p.rate,
      tip: [formatPercent(p.rate), t.overview.game(formatNumber(p.index)), t.overview.n(formatNumber(p.n)), formatShortDateTime(p.playedAt)],
    }));
}

export function rankPoints(s: OverviewSnapshot): ChartPoint[] {
  return s.rank.map((p, i) => ({
    x: i,
    y: Math.min(p.rank, LEGEND_INDEX),
    tip: [rankLabel(p.rank), formatShortDateTime(p.playedAt)],
  }));
}

export function currentRank(s: OverviewSnapshot): string | null {
  return s.rank.length ? rankLabel(s.rank[s.rank.length - 1].rank) : null;
}
