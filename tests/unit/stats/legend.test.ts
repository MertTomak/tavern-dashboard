import { describe, expect, it } from "vitest";
import { expectedStars, legendEstimate } from "@/lib/stats/legend";

describe("legend estimate", () => {
  it("is hidden at 50% or lower and at Legend", () => {
    expect(legendEstimate(30, 0.5)).toBeNull();
    expect(legendEstimate(30, 0.42)).toBeNull();
    expect(legendEstimate(50, 0.7)).toBeNull();
  });

  it("expects +1/−1 stars plus a streak bonus below Diamond 5", () => {
    expect(expectedStars(0.6, false)).toBeCloseTo(0.2);
    expect(expectedStars(0.6, true)).toBeCloseTo(0.2 + 0.216);
  });

  it("counts Diamond 5 → Legend without the streak bonus", () => {
    // Diamond 5 (index 45): 5 ranks × 3 stars = 15 stars at 0.2 per game = 75 games.
    expect(legendEstimate(45, 0.6)).toEqual({ games: 75, stars: 15 });
    // Diamond 1: 3 stars / 0.2 = 15 games.
    expect(legendEstimate(49, 0.6)).toEqual({ games: 15, stars: 3 });
  });

  it("adds the bonus part below Diamond 5", () => {
    // Platinum 1 (index 39): 6 ranks with bonus (18 stars / 0.416) + 15 stars / 0.2.
    expect(legendEstimate(39, 0.6)?.games).toBe(Math.ceil(18 / 0.416 + 75));
  });
});
