import { winRate, type GameResult, type WinRate } from "./winrate";

export type OverviewGame = {
  id: string;
  playedAt: string; // UTC ISO-8601
  mode: string;
  result: GameResult;
  playerClass: string;
  opponentClass: string;
  deckName: string | null;
  rankAfter: number | null;
  durationSec: number | null;
};

export type Streak = { result: "WIN" | "LOSS"; length: number } | null;

export type OverviewSnapshot = {
  overall: WinRate;
  last7: WinRate;
  prev7: WinRate;
  streak: Streak;
  rolling: { index: number; playedAt: string; rate: number; n: number }[];
  daily: { day: string; games: number; rate: number; n: number }[];
  byOpponent: { cls: string; wr: WinRate; share: number }[];
  byDeck: { name: string; cls: string; wr: WinRate; lastPlayed: string }[];
  recent: OverviewGame[];
  rank: { playedAt: string; rank: number }[];
  avgDurationSec: number | null;
  mainClass: string | null;
};

const DAY_MS = 24 * 3600 * 1000;

/** YYYY-MM-DD of an instant in the given time zone. */
export function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function currentStreak(sortedAsc: readonly OverviewGame[]): Streak {
  let result: "WIN" | "LOSS" | null = null;
  let length = 0;
  for (let i = sortedAsc.length - 1; i >= 0; i--) {
    const r = sortedAsc[i].result;
    if (r === "TIE") continue;
    if (result === null) result = r;
    if (r !== result) break;
    length++;
  }
  return result ? { result, length } : null;
}

export function rollingWinRate(sortedAsc: readonly OverviewGame[], window = 20) {
  const decided = sortedAsc.filter((g) => g.result !== "TIE");
  return decided.map((g, i) => {
    const slice = decided.slice(Math.max(0, i - window + 1), i + 1);
    const wr = winRate(slice.map((s) => s.result));
    return { index: i + 1, playedAt: g.playedAt, rate: wr.rate, n: wr.n };
  });
}

export function buildOverviewSnapshot(
  games: readonly OverviewGame[],
  opts: { now: Date; timeZone: string; rollingWindow?: number },
): OverviewSnapshot {
  const sorted = [...games].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const nowMs = opts.now.getTime();
  const within = (from: number, to: number) =>
    sorted.filter((g) => {
      const t = Date.parse(g.playedAt);
      return t > nowMs - from && t <= nowMs - to;
    });

  const byDay = new Map<string, GameResult[]>();
  for (const g of sorted) {
    const k = dayKey(g.playedAt, opts.timeZone);
    byDay.set(k, [...(byDay.get(k) ?? []), g.result]);
  }

  const oppGroups = new Map<string, GameResult[]>();
  for (const g of sorted) oppGroups.set(g.opponentClass, [...(oppGroups.get(g.opponentClass) ?? []), g.result]);

  const deckGroups = new Map<string, { cls: string; results: GameResult[]; last: string }>();
  for (const g of sorted) {
    if (!g.deckName) continue;
    const cur = deckGroups.get(g.deckName) ?? { cls: g.playerClass, results: [], last: g.playedAt };
    cur.results.push(g.result);
    cur.last = g.playedAt;
    deckGroups.set(g.deckName, cur);
  }

  const played = new Map<string, number>();
  for (const g of sorted) played.set(g.playerClass, (played.get(g.playerClass) ?? 0) + 1);
  const mainClass = [...played.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const durations = sorted.flatMap((g) => (g.durationSec == null ? [] : [g.durationSec]));

  return {
    overall: winRate(sorted.map((g) => g.result)),
    last7: winRate(within(7 * DAY_MS, 0).map((g) => g.result)),
    prev7: winRate(within(14 * DAY_MS, 7 * DAY_MS).map((g) => g.result)),
    streak: currentStreak(sorted),
    rolling: rollingWinRate(sorted, opts.rollingWindow ?? 20),
    daily: [...byDay.entries()].map(([day, results]) => {
      const wr = winRate(results);
      return { day, games: results.length, rate: wr.rate, n: wr.n };
    }),
    byOpponent: [...oppGroups.entries()]
      .map(([cls, results]) => ({ cls, wr: winRate(results), share: results.length / sorted.length }))
      .sort((a, b) => b.wr.n - a.wr.n),
    byDeck: [...deckGroups.entries()]
      .map(([name, d]) => ({ name, cls: d.cls, wr: winRate(d.results), lastPlayed: d.last }))
      .sort((a, b) => b.wr.lower - a.wr.lower),
    recent: sorted.slice(-10).reverse(),
    rank: sorted.flatMap((g) =>
      g.mode === "RANKED" && g.rankAfter != null ? [{ playedAt: g.playedAt, rank: g.rankAfter }] : [],
    ),
    avgDurationSec: durations.length
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : null,
    mainClass,
  };
}
