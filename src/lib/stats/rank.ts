import { t } from "@/i18n";

/** Numeric rank index: leagueIndex * 10 + (10 - level). 50 and above is Legend. */
export const LEGEND_INDEX = 50;

/** Leagues below Legend, lowest first (Bronze … Diamond). */
export const LEAGUE_COUNT = 5;

/** A rank as the game shows it: a league and its level 10 (lowest) … 1, or Legend with an optional number. */
export type RankParts = { league: number; level: number } | { league: "legend"; legendRank: number | null };

/** 0 -> "Bronze 10", 49 -> "Diamond 1", 50+ -> "Legend". */
export function rankLabel(index: number, legendRank?: number | null): string {
  if (index >= LEGEND_INDEX) return legendRank ? t.ranks.legendNumber(legendRank) : t.ranks.legend;
  const i = Math.max(0, Math.floor(index));
  const league = t.ranks.leagues[Math.floor(i / 10)];
  return `${league} ${10 - (i % 10)}`;
}

/** League 0–4 and level 10…1 -> index (Bronze 10 = 0, Diamond 1 = 49). */
export function rankIndex(league: number, level: number): number {
  return league * 10 + (10 - level);
}

/** Index -> league and level, or Legend. Fractional indexes from older data round down. */
export function rankParts(index: number, legendRank: number | null = null): RankParts {
  if (index >= LEGEND_INDEX) return { league: "legend", legendRank };
  const i = Math.max(0, Math.floor(index));
  return { league: Math.floor(i / 10), level: 10 - (i % 10) };
}
