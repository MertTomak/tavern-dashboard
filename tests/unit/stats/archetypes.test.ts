import { describe, expect, it } from "vitest";
import { archetypeKey, classifyArchetype, type ArchetypeRule } from "@/lib/stats/archetypes";

const rule = (id: number, cls: string, cards: number[], minMatches = 2, name = `A${id}`): ArchetypeRule => ({ id, name, playerClass: cls, signatureCards: cards, minMatches });

describe("classifyArchetype", () => {
  const rules = [rule(1, "PALADIN", [1, 2, 3, 4]), rule(2, "PALADIN", [3, 4, 5, 6, 7, 8]), rule(3, "MAGE", [1, 2, 3])];

  it("returns null without enough signature cards", () => {
    expect(classifyArchetype("PALADIN", [], rules)).toBeNull();
    expect(classifyArchetype("PALADIN", [1, 9], rules)).toBeNull();
  });

  it("needs minMatches distinct cards (copies count once)", () => {
    expect(classifyArchetype("PALADIN", [1, 1, 1], rules)).toBeNull();
    expect(classifyArchetype("PALADIN", [1, 2], rules)).toEqual({ id: 1, name: "A1", matches: 2 });
  });

  it("only considers the opponent's class", () => {
    expect(classifyArchetype("WARRIOR", [1, 2, 3], rules)).toBeNull();
    expect(classifyArchetype("MAGE", [1, 2], rules)?.id).toBe(3);
  });

  it("picks the most matched signature cards", () => {
    expect(classifyArchetype("PALADIN", [3, 4, 5], rules)?.id).toBe(2);
  });

  it("breaks a tie by the larger share of the signature, then the older rule", () => {
    // Both match 3 and 4: rule 1 has 2/4, rule 2 has 2/6.
    expect(classifyArchetype("PALADIN", [3, 4], rules)?.id).toBe(1);
    const same = [rule(5, "ROGUE", [1, 2]), rule(4, "ROGUE", [1, 2])];
    expect(classifyArchetype("ROGUE", [1, 2], same)?.id).toBe(4);
  });

  it("ignores empty rules and treats minMatches below 1 as 1", () => {
    expect(classifyArchetype("PRIEST", [1], [rule(1, "PRIEST", []), rule(2, "PRIEST", [1], 0)])?.id).toBe(2);
  });
});

describe("reprints", () => {
  it("counts two prints of one card as the same card when keyed by name", () => {
    const names: Record<number, string> = { 10: "Equality", 11: "Equality", 12: "Consecration" };
    const key = (id: number) => names[id] ?? id;
    const rules = [rule(1, "PALADIN", [10, 12])];
    expect(classifyArchetype("PALADIN", [11, 12].map(key), rules, key)?.id).toBe(1);
    expect(classifyArchetype("PALADIN", [11, 12], rules)).toBeNull();
  });
});

describe("archetypeKey", () => {
  it("keys unknown opponents by class", () => {
    expect(archetypeKey(null, "MAGE")).toBe("unknown:MAGE");
    expect(archetypeKey(7, "MAGE")).toBe("7");
  });
});
