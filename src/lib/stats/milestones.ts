import type { OverviewGame } from "./overview";
import { LEGEND_INDEX } from "./rank";

export type Milestone =
  | { kind: "league"; gameId: string; playedAt: string; league: number }
  | { kind: "legend"; gameId: string; playedAt: string }
  | { kind: "newDeck"; gameId: string; playedAt: string; deck: string }
  | { kind: "longestStreak"; gameId: string; playedAt: string; length: number };

/**
 * Key moments of a season, in played order, for annotating charts:
 * reaching a new league (first time), reaching Legend (first time),
 * the first game with a new deck, and the end of the longest win streak.
 * Pure: input must be sorted oldest first.
 */
export function findMilestones(sortedAsc: readonly OverviewGame[]): Milestone[] {
  const out: Milestone[] = [];

  let bestLeague: number | null = null;
  let legend = false;
  for (const g of sortedAsc) {
    if (g.mode !== "RANKED" || g.rankAfter == null || legend) continue;
    if (g.rankAfter >= LEGEND_INDEX) {
      legend = true;
      out.push({ kind: "legend", gameId: g.id, playedAt: g.playedAt });
      continue;
    }
    const league = Math.floor(g.rankAfter / 10);
    if (bestLeague === null) bestLeague = league;
    else if (league > bestLeague && g.rankAfter < LEGEND_INDEX) {
      bestLeague = league;
      out.push({ kind: "league", gameId: g.id, playedAt: g.playedAt, league });
    }
  }

  const seenDecks = new Set<string>();
  for (const [i, g] of sortedAsc.entries()) {
    if (!g.deckName || seenDecks.has(g.deckName)) continue;
    seenDecks.add(g.deckName);
    if (i > 0) out.push({ kind: "newDeck", gameId: g.id, playedAt: g.playedAt, deck: g.deckName });
  }

  let run = 0;
  let best = 0;
  let bestEnd: OverviewGame | null = null;
  for (const g of sortedAsc) {
    if (g.result === "TIE") continue;
    run = g.result === "WIN" ? run + 1 : 0;
    if (run > best) {
      best = run;
      bestEnd = g;
    }
  }
  if (bestEnd && best >= 3) {
    out.push({ kind: "longestStreak", gameId: bestEnd.id, playedAt: bestEnd.playedAt, length: best });
  }

  return out.sort((a, b) => a.playedAt.localeCompare(b.playedAt));
}
