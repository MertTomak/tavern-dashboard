import { LEGEND_INDEX } from "./rank";

/** Stars in one rank (e.g. Gold 5 → Gold 4). */
export const STARS_PER_RANK = 3;
/** Win-streak bonus stars stop at Diamond 5 (rank index 45). */
export const STREAK_BONUS_UNTIL = 45;

/**
 * Expected net stars per game at win rate p. A win is +1, a loss −1; below
 * Diamond 5 a win that extends a streak of 3 earns one extra star. Games are
 * taken as independent, so the chance a win comes after two wins is p³.
 */
export function expectedStars(p: number, streakBonus: boolean): number {
  return p - (1 - p) + (streakBonus ? p ** 3 : 0);
}

export type LegendEstimate = { games: number; stars: number };

/**
 * Games left to reach Legend from a rank index at win rate p, or null when the
 * estimate does not apply: at Legend already, or a win rate of 50% or lower
 * (net progress stalls). Stars already earned inside the current rank are not
 * known, so the count starts from its floor; the result is rounded up.
 */
export function legendEstimate(rankIndex: number, p: number): LegendEstimate | null {
  if (rankIndex >= LEGEND_INDEX || p <= 0.5) return null;
  const index = Math.max(0, Math.floor(rankIndex));
  const withBonus = Math.max(0, STREAK_BONUS_UNTIL - index) * STARS_PER_RANK;
  const without = (LEGEND_INDEX - Math.max(index, STREAK_BONUS_UNTIL)) * STARS_PER_RANK;
  const games = withBonus / expectedStars(p, true) + without / expectedStars(p, false);
  // Float noise (0.6 − 0.4 is not exactly 0.2) must not add a game.
  return { games: Math.ceil(games - 1e-9), stars: withBonus + without };
}
