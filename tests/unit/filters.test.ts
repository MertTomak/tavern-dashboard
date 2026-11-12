import { describe, expect, it } from "vitest";
import { parseFilters, rangeStart } from "@/lib/filters";

const TZ = "Europe/Istanbul";

describe("filters", () => {
  it("falls back to defaults for unknown values", () => {
    expect(parseFilters({ range: "forever", mode: "CHESS" })).toEqual({ range: "30d", mode: undefined, format: undefined });
    expect(parseFilters({ range: "7d", mode: "RANKED", format: ["WILD"] })).toEqual({ range: "7d", mode: "RANKED", format: "WILD" });
  });

  it("starts 'today' at Istanbul midnight", () => {
    // 22:00 UTC on 12 Nov is 01:00 on 13 Nov in Istanbul, so today began at 21:00 UTC on 12 Nov.
    expect(rangeStart("today", new Date("2026-11-12T22:00:00Z"), TZ)).toBe("2026-11-12T21:00:00.000Z");
    expect(rangeStart("today", new Date("2026-11-12T12:00:00Z"), TZ)).toBe("2026-11-11T21:00:00.000Z");
  });

  it("starts the season on the 1st of the month in Istanbul", () => {
    expect(rangeStart("season", new Date("2026-11-12T12:00:00Z"), TZ)).toBe("2026-10-31T21:00:00.000Z");
  });

  it("returns null for all time", () => {
    expect(rangeStart("all", new Date(), TZ)).toBeNull();
  });
});
