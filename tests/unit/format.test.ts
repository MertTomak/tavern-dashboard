import { describe, expect, it } from "vitest";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";

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
