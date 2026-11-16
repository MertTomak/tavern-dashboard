import { formatPercent } from "@/lib/format";
import { t } from "@/i18n";
import { winRate, type GameResult, type WinRate } from "./winrate";

/**
 * Insight engine: short English sentences that read the numbers for the user.
 * It only speaks when every compared group has at least 20 games and the two
 * groups' 95% ranges do not overlap, so it never calls chance a pattern.
 */

/** Every group in a comparison needs this many games (wins + losses). */
export const INSIGHT_MIN_N = 20;
export const MAX_INSIGHTS = 5;

export type InsightGame = {
  playedAt: string; // UTC ISO-8601
  result: GameResult;
  opponentClass: string;
  /** Opponent archetype name (null = unknown). */
  opponentArchetype: string | null;
  wentFirst: boolean | null;
  deckId: number | null;
  deckName: string | null;
  versionNo: number | null;
};

export type Insight = {
  id: string;
  severity: "info" | "good" | "warn";
  text: string;
  /** What is compared, for tests and tooltips. */
  metric: string;
  /** Games behind the insight (both groups together). */
  n: number;
  /** Size of the gap in win rate (0–1), used to rank insights of the same severity. */
  gap: number;
};

export type InsightResult = { insights: Insight[]; games: number; status: "ready" | "needMore" | "noPattern"; needed: number };

const pct = (r: number) => formatPercent(r).replace(".0%", "%");
const enough = (...groups: WinRate[]) => groups.every((g) => g.n >= INSIGHT_MIN_N);
/** True when the two 95% Wilson ranges do not overlap. */
export const separated = (a: WinRate, b: WinRate) => a.upper < b.lower || b.upper < a.lower;
const compare = (a: WinRate, b: WinRate) => enough(a, b) && separated(a, b);

/** Hour bucket in the given time zone. */
function dayPart(iso: string, timeZone: string): "morning" | "afternoon" | "evening" | "night" {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
  return hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

/** Splits games into one group per key, and everything else, as win rates. */
function versusRest(games: readonly InsightGame[], key: (g: InsightGame) => string | null): { key: string; group: WinRate; rest: WinRate }[] {
  const keys = new Set(games.map(key).filter((k): k is string => k !== null));
  return [...keys].map((k) => ({
    key: k,
    group: winRate(games.filter((g) => key(g) === k).map((g) => g.result)),
    rest: winRate(games.filter((g) => key(g) !== k).map((g) => g.result)),
  }));
}

/** Pure: up to five insights from the games (with "now" and the time zone injected). */
export function buildInsights(games: readonly InsightGame[], opts: { now: Date; timeZone: string; classLabel: (cls: string) => string }): InsightResult {
  const copy = t.insights;
  const out: Insight[] = [];

  // Toughest and easiest matchup, by class or by archetype, against the rest of the games.
  const matchups = [
    ...versusRest(games, (g) => g.opponentClass).map((m) => ({ ...m, name: opts.classLabel(m.key) })),
    ...versusRest(games, (g) => g.opponentArchetype).map((m) => ({ ...m, name: m.key })),
  ].filter((m) => compare(m.group, m.rest));
  const toughest = matchups.filter((m) => m.group.rate < m.rest.rate).sort((a, b) => a.group.rate - b.group.rate)[0];
  const easiest = matchups.filter((m) => m.group.rate > m.rest.rate).sort((a, b) => b.group.rate - a.group.rate)[0];
  if (toughest) {
    out.push({ id: `toughest:${toughest.key}`, severity: "warn", metric: "matchup", text: copy.toughest(toughest.name, pct(toughest.group.rate), toughest.group.n, pct(toughest.rest.rate)), n: toughest.group.n + toughest.rest.n, gap: toughest.rest.rate - toughest.group.rate });
  }
  if (easiest) {
    out.push({ id: `easiest:${easiest.key}`, severity: "good", metric: "matchup", text: copy.easiest(easiest.name, pct(easiest.group.rate), easiest.group.n, pct(easiest.rest.rate)), n: easiest.group.n + easiest.rest.n, gap: easiest.group.rate - easiest.rest.rate });
  }

  // Going first vs the coin.
  const first = winRate(games.filter((g) => g.wentFirst === true).map((g) => g.result));
  const coin = winRate(games.filter((g) => g.wentFirst === false).map((g) => g.result));
  if (compare(first, coin)) {
    out.push({ id: "coin", severity: "info", metric: "start", text: copy.coin(pct(first.rate), pct(coin.rate), first.n, coin.n), n: first.n + coin.n, gap: Math.abs(first.rate - coin.rate) });
  }

  // Best (or worst) time of day.
  const parts = versusRest(games, (g) => dayPart(g.playedAt, opts.timeZone)).filter((p) => compare(p.group, p.rest));
  const best = parts.sort((a, b) => Math.abs(b.group.rate - b.rest.rate) - Math.abs(a.group.rate - a.rest.rate))[0];
  if (best) {
    const better = best.group.rate > best.rest.rate;
    out.push({
      id: `time:${best.key}`,
      severity: better ? "good" : "warn",
      metric: "time",
      text: copy.time(copy.dayParts[best.key as keyof typeof copy.dayParts], pct(best.group.rate), pct(best.rest.rate), best.group.n, best.rest.n),
      n: best.group.n + best.rest.n,
      gap: Math.abs(best.group.rate - best.rest.rate),
    });
  }

  // Last 7 days against everything before.
  const weekAgo = new Date(opts.now.getTime() - 7 * 86_400_000).toISOString();
  const recent = winRate(games.filter((g) => g.playedAt >= weekAgo).map((g) => g.result));
  const before = winRate(games.filter((g) => g.playedAt < weekAgo).map((g) => g.result));
  if (compare(recent, before)) {
    const up = recent.rate > before.rate;
    out.push({ id: "trend", severity: up ? "good" : "warn", metric: "trend", text: (up ? copy.trendUp : copy.trendDown)(pct(recent.rate), recent.n, pct(before.rate), before.n), n: recent.n + before.n, gap: Math.abs(recent.rate - before.rate) });
  }

  // Newest deck version against the one before it.
  const decks = new Map<number, { name: string; versions: Map<number, GameResult[]> }>();
  for (const g of games) {
    if (g.deckId === null || g.versionNo === null) continue;
    const d = decks.get(g.deckId) ?? { name: g.deckName ?? "", versions: new Map() };
    d.versions.set(g.versionNo, [...(d.versions.get(g.versionNo) ?? []), g.result]);
    decks.set(g.deckId, d);
  }
  for (const [id, d] of decks) {
    const [newest, previous] = [...d.versions.keys()].sort((a, b) => b - a);
    if (previous === undefined) continue;
    const a = winRate(d.versions.get(newest) ?? []);
    const b = winRate(d.versions.get(previous) ?? []);
    if (!compare(a, b)) continue;
    out.push({ id: `version:${id}`, severity: a.rate > b.rate ? "good" : "warn", metric: "version", text: copy.version(d.name, newest, pct(a.rate), previous, pct(b.rate), a.n, b.n), n: a.n + b.n, gap: Math.abs(a.rate - b.rate) });
  }

  const order = { warn: 0, good: 1, info: 2 } as const;
  const insights = out.sort((a, b) => order[a.severity] - order[b.severity] || b.gap - a.gap).slice(0, MAX_INSIGHTS);
  const decided = winRate(games.map((g) => g.result)).n;
  // The first comparison possible needs two groups of 20 (e.g. going first and on the coin).
  const needed = Math.max(0, 2 * INSIGHT_MIN_N - decided);
  return { insights, games: decided, status: insights.length ? "ready" : needed ? "needMore" : "noPattern", needed };
}
