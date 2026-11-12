export type GameResult = "WIN" | "LOSS" | "TIE";

export type WinRate = {
  /** wins / (wins + losses); 0 when n is 0. Ties never count. */
  rate: number;
  lower: number;
  upper: number;
  n: number;
  wins: number;
  losses: number;
  ties: number;
  lowSample: boolean;
};

export const LOW_SAMPLE_N = 10;

/** 95% Wilson score interval for k successes out of n. */
export function wilson(k: number, n: number, z = 1.96): { lower: number; upper: number } {
  if (n === 0) return { lower: 0, upper: 0 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return { lower: (centre - margin) / denom, upper: (centre + margin) / denom };
}

export function winRate(results: readonly GameResult[]): WinRate {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const r of results) {
    if (r === "WIN") wins++;
    else if (r === "LOSS") losses++;
    else ties++;
  }
  const n = wins + losses;
  const { lower, upper } = wilson(wins, n);
  return {
    rate: n ? wins / n : 0,
    lower,
    upper,
    n,
    wins,
    losses,
    ties,
    lowSample: n < LOW_SAMPLE_N,
  };
}
