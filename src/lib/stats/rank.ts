import { t } from "@/i18n";

/** Numeric rank index: leagueIndex * 10 + (10 - level). 50 and above is Legend. */
export const LEGEND_INDEX = 50;

/** 0 -> "Bronze 10", 49 -> "Diamond 1", 50+ -> "Legend". */
export function rankLabel(index: number): string {
  if (index >= LEGEND_INDEX) return t.ranks.legend;
  const i = Math.max(0, Math.floor(index));
  const league = t.ranks.leagues[Math.floor(i / 10)];
  return `${league} ${10 - (i % 10)}`;
}
