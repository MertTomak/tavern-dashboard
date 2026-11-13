import { describe, expect, it } from "vitest";
import { HOLD, held, stripClip } from "@/components/tavern/journey/geometry";

describe("held", () => {
  it("rests on each chapter for HOLD on either side", () => {
    expect(held(0, 4)).toBe(0);
    expect(held(1 + HOLD * 0.9, 4)).toBe(1);
    expect(held(2 - HOLD * 0.9, 4)).toBe(2);
  });

  it("moves halfway at the midpoint and never past the ends", () => {
    expect(held(1.5, 4)).toBeCloseTo(1.5);
    expect(held(-1, 4)).toBe(0);
    expect(held(9, 4)).toBe(4);
  });

  it("only moves forward as the scroll does", () => {
    let prev = -1;
    for (let p = 0; p <= 4; p += 0.01) {
      const h = held(p, 4);
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });
});

describe("stripClip", () => {
  it("leaves a whole chapter unclipped", () => {
    expect(stripClip(0)).toBe("none");
  });

  /** The right edge of each strip, in %. */
  const edges = (clip: string) =>
    clip
      .slice("polygon(".length, -1)
      .split(", ")
      .slice(1, -1)
      .filter((_, i) => i % 2 === 0)
      .map((pt) => parseFloat(pt));

  it("has one step per strip, and clears every strip by the end", () => {
    expect(edges(stripClip(0.01))).toHaveLength(6);
    expect(edges(stripClip(1)).every((e) => e === 0)).toBe(true);
  });

  it("moves strips at different paces mid-way", () => {
    expect(new Set(edges(stripClip(0.5))).size).toBeGreaterThan(3);
  });

  it("is a plain wipe with one strip", () => {
    expect(stripClip(0.5, 1)).toBe("polygon(0% 0%, 50.00% 0.00%, 50.00% 100.00%, 0% 100%)");
  });
});
