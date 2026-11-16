import { describe, expect, it } from "vitest";
import { versionDiff } from "@/lib/stats/versions";

describe("versionDiff", () => {
  it("is empty for the same list", () => {
    expect(versionDiff([{ dbfId: 1, count: 2 }], [{ dbfId: 1, count: 2 }])).toEqual([]);
  });

  it("lists removed cards first, then added, with count changes", () => {
    const before = [
      { dbfId: 1, count: 2 },
      { dbfId: 2, count: 2 },
      { dbfId: 3, count: 1 },
    ];
    const after = [
      { dbfId: 1, count: 2 },
      { dbfId: 2, count: 1 },
      { dbfId: 4, count: 2 },
    ];
    expect(versionDiff(before, after)).toEqual([
      { dbfId: 2, from: 2, to: 1 },
      { dbfId: 3, from: 1, to: 0 },
      { dbfId: 4, from: 0, to: 2 },
    ]);
  });
});
