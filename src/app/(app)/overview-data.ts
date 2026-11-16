import { getInsightGames, getOverviewGames } from "@/lib/db/queries/overview";
import { buildInsights } from "@/lib/stats/insights";
import { legendEstimate } from "@/lib/stats/legend";
import { getLatestDeckCardIds } from "@/lib/db/queries/decks";
import { getClassArtChoices } from "@/lib/db/queries/preferences";
import { buildOverviewSnapshot } from "@/lib/stats/overview";
import { findMilestones, type Milestone } from "@/lib/stats/milestones";
import { LEGEND_INDEX, rankLabel } from "@/lib/stats/rank";
import { winRate } from "@/lib/stats/winrate";
import { cardsByDbf, effectiveClassArt, newestSetInfo, pickDaily, pickSignatureCard } from "@/lib/cards/catalog";
import { classLabel } from "@/lib/cards/class-colors";
import { rangeStart, type Filters } from "@/lib/filters";
import { formatNumber, formatPercent, formatShortDateTime } from "@/lib/format";
import type { OverviewData } from "@/components/tavern/types";
import { TIME_ZONE, t } from "@/i18n";

const ROLLING_WINDOW = 20;

function milestoneLabel(m: Milestone): string {
  switch (m.kind) {
    case "league":
      return t.milestones.league(t.ranks.leagues[m.league] ?? "");
    case "legend":
      return t.milestones.legend;
    case "newDeck":
      return t.milestones.newDeck(m.deck);
    case "longestStreak":
      return t.milestones.longestStreak(m.length);
  }
}

/** Builds everything the Overview shows for the given URL filters, or null if no games match. */
export function loadOverview(filters: Filters, now: Date): OverviewData | null {
  const games = getOverviewGames({ from: rangeStart(filters.range, now, TIME_ZONE), mode: filters.mode, format: filters.format });
  if (!games.length) return null;

  const s = buildOverviewSnapshot(games, { now, timeZone: TIME_ZONE, rollingWindow: ROLLING_WINDOW });
  const milestones = findMilestones(games);
  const choices = getClassArtChoices();
  const art = (cls: string) => effectiveClassArt(cls, choices) ?? "";

  const todayStart = rangeStart("today", now, TIME_ZONE) ?? "";
  const today = winRate(games.filter((g) => g.playedAt >= todayStart).map((g) => g.result));

  const { set, featured } = newestSetInfo();
  const pick = pickDaily(featured, now, TIME_ZONE);

  const minN = Math.min(ROLLING_WINDOW, s.overall.n);
  const rollingFull = s.rolling.filter((p) => p.n >= minN);
  const rollingX = new Map(s.rolling.map((p) => [p.gameId, p.index]));
  const firstX = rollingFull[0]?.index ?? 0;
  const rankX = new Map(s.rank.map((p, i) => [p.gameId, i]));
  const lastRank = s.rank.at(-1)?.rank ?? null;
  // Legend estimate from the ranked win rate in these filters; quiet on a thin record.
  const ranked = winRate(games.filter((g) => g.mode === "RANKED").map((g) => g.result));
  const est = lastRank === null || ranked.lowSample ? null : legendEstimate(lastRank, ranked.rate);
  const deckCards = getLatestDeckCardIds();
  const from = rangeStart(filters.range, now, TIME_ZONE);
  const ins = buildInsights(getInsightGames({ from, mode: filters.mode, format: filters.format }), { now, timeZone: TIME_ZONE, classLabel });

  return {
    insights: {
      items: ins.insights.map((i) => ({ id: i.id, severity: i.severity, text: i.text })),
      note: ins.status === "needMore" ? t.insights.needMore(ins.needed) : ins.status === "noPattern" ? t.insights.noPattern(formatNumber(ins.games)) : null,
    },
    rangeLabel: t.filters.ranges[filters.range],
    featured: pick ? { id: pick.id, name: pick.name, set: (set && t.sets[set]) ?? set ?? "" } : null,
    winRate: s.overall.rate,
    wins: s.overall.wins,
    losses: s.overall.losses,
    games: games.length,
    today: { wins: today.wins, losses: today.losses, n: today.n },
    streak: s.streak,
    last7: { rate: s.last7.rate, n: s.last7.n },
    rank:
      lastRank === null
        ? null
        : {
            label: rankLabel(lastRank),
            index: Math.min(lastRank, LEGEND_INDEX),
            progress: Math.min(lastRank, LEGEND_INDEX) / LEGEND_INDEX,
            legend: lastRank >= LEGEND_INDEX,
            estimate: est && { games: est.games, rate: ranked.rate, n: ranked.n },
          },
    recent: s.recent.slice(0, 10).map((g) => ({
      id: g.id,
      result: g.result,
      myClass: g.playerClass,
      myArt: art(g.playerClass),
      oppClass: g.opponentClass,
      oppArt: art(g.opponentClass),
      oppLabel: classLabel(g.opponentClass),
      when: formatShortDateTime(g.playedAt),
    })),
    classes: [...s.byOpponent]
      .sort((a, b) => b.wr.rate - a.wr.rate || b.wr.n - a.wr.n)
      .map((o) => ({
        cls: o.cls,
        label: classLabel(o.cls),
        art: art(o.cls),
        rate: o.wr.rate,
        wins: o.wr.wins,
        losses: o.wr.losses,
        n: o.wr.n,
        lowSample: o.wr.lowSample,
      })),
    decks: s.byDeck.map((d) => {
      const sig = pickSignatureCard(cardsByDbf(deckCards.get(d.name) ?? []), d.cls);
      return {
        name: d.name,
        cls: d.cls,
        label: classLabel(d.cls),
        art: sig?.id ?? art(d.cls),
        cardName: sig?.name ?? null,
        rate: d.wr.rate,
        wins: d.wr.wins,
        losses: d.wr.losses,
        n: d.wr.n,
        lowSample: d.wr.lowSample,
      };
    }),
    rolling: {
      window: ROLLING_WINDOW,
      points: rollingFull.map((p) => ({
        x: p.index,
        y: p.rate,
        tip: [formatPercent(p.rate), t.overview.game(formatNumber(p.index)), formatShortDateTime(p.playedAt)],
      })),
      milestones: milestones
        .filter((m) => m.kind === "newDeck" || m.kind === "longestStreak")
        .flatMap((m) => {
          const x = rollingX.get(m.gameId);
          return x !== undefined && x >= firstX ? [{ x, kind: m.kind, label: milestoneLabel(m) }] : [];
        }),
    },
    climb: {
      points: s.rank.map((p, i) => ({
        x: i,
        y: Math.min(p.rank, LEGEND_INDEX),
        tip: [rankLabel(p.rank), formatShortDateTime(p.playedAt)],
      })),
      milestones: milestones
        .filter((m) => m.kind === "league" || m.kind === "legend")
        .flatMap((m) => {
          const x = rankX.get(m.gameId);
          return x !== undefined ? [{ x, kind: m.kind, label: milestoneLabel(m) }] : [];
        }),
    },
  };
}
