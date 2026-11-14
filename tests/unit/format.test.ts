import { describe, expect, it } from "vitest";
import { formatDateTime, formatDuration, formatLength, formatNumber, formatPercent, formatPointsDelta, formatTime } from "@/lib/format";
import { rankLabel } from "@/lib/stats/rank";

describe("en-GB formatting", () => {
  it("formats percentages with one decimal", () => {
    expect(formatPercent(0.543)).toBe("54.3%");
  });

  it("formats numbers with comma thousands separators", () => {
    expect(formatNumber(1284)).toBe("1,284");
  });

  it("formats dates in the Europe/Istanbul zone", () => {
    // 2026-11-12T18:40:00Z is 21:40 in Istanbul (UTC+3)
    expect(formatDateTime("2026-11-12T18:40:00Z")).toBe("12 Nov 2026, 21:40");
  });

  it("rolls over to the next day across midnight (UTC 21:30 = Istanbul 00:30)", () => {
    expect(formatDateTime("2026-11-12T21:30:00Z")).toBe("13 Nov 2026, 00:30");
  });
});

describe("extra formatting", () => {
  it("formats durations and point deltas", () => {
    expect(formatDuration(432)).toBe("7m 12s");
    expect(formatDuration(45)).toBe("45s");
    expect(formatPointsDelta(0.041)).toBe("+4.1 pts");
    expect(formatPointsDelta(-0.02)).toBe("−2.0 pts");
  });

  it("labels rank indexes", () => {
    expect(rankLabel(0)).toBe("Bronze 10");
    expect(rankLabel(49)).toBe("Diamond 1");
    expect(rankLabel(42.6)).toBe("Diamond 8");
    expect(rankLabel(75)).toBe("Legend");
  });

  it("formats a time of day in Istanbul and the length of a sitting", () => {
    expect(formatTime("2026-11-14T21:30:00.000Z")).toBe("00:30");
    expect(formatLength(2880)).toBe("48m");
    expect(formatLength(4320)).toBe("1h 12m");
    expect(formatLength(20)).toBe("1m");
  });
});
