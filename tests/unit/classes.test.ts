import { describe, expect, it } from "vitest";
import { deriveClasses, type Card } from "@/lib/cards/classes";

const card = (dbfId: number, cardClass: string, type: string): Card => ({
  dbfId,
  id: `C_${dbfId}`,
  name: `Card ${dbfId}`,
  cardClass,
  type,
});

describe("deriveClasses", () => {
  it("derives playable classes from hero cards, sorted and unique", () => {
    const cards = [
      card(1, "MAGE", "HERO"),
      card(2, "DRUID", "HERO"),
      card(3, "MAGE", "HERO"),
      card(4, "NEUTRAL", "MINION"),
    ];
    expect(deriveClasses(cards)).toEqual(["DRUID", "MAGE"]);
  });

  it("picks up a brand new class without code changes", () => {
    expect(deriveClasses([card(9, "MONK", "HERO")])).toEqual(["MONK"]);
  });

  it("ignores non-playable pseudo classes", () => {
    expect(deriveClasses([card(5, "NEUTRAL", "HERO"), card(6, "DREAM", "HERO")])).toEqual([]);
  });
});
