import { describe, expect, it } from "vitest";
import { encode } from "deckstrings";
import { extractDeckCode, manaCurve, parseDeckCode } from "@/lib/cards/deck-code";
import type { Card } from "@/lib/cards/classes";

const CARDS: Card[] = [
  { dbfId: 7, id: "HERO_01", name: "Garrosh Hellscream", cardClass: "WARRIOR", type: "HERO" },
  { dbfId: 100, id: "W1", name: "Shield Slam", cardClass: "WARRIOR", type: "SPELL", cost: 1 },
  { dbfId: 101, id: "W2", name: "Brawl", cardClass: "WARRIOR", type: "SPELL", cost: 5 },
  { dbfId: 200, id: "N1", name: "Loot Hoarder", cardClass: "NEUTRAL", type: "MINION", cost: 2 },
];
const byDbf = (id: number) => CARDS.find((c) => c.dbfId === id);

const code = encode({ cards: [[200, 2], [100, 2], [101, 1]], heroes: [7], format: 2 });

describe("deck codes", () => {
  it("finds the name and the code in what the game copies", () => {
    const text = `### Control Warrior\n# Class: Warrior\n# Format: Standard\n#\n# 2x (1) Shield Slam\n#\n${code}\n#\n# To use this deck, copy it to your clipboard and create a new deck in Hearthstone`;
    expect(extractDeckCode(text)).toEqual({ code, name: "Control Warrior" });
    expect(extractDeckCode(`  ${code}  `)).toEqual({ code, name: null });
  });

  it("decodes class, format and cards, in a canonical order", () => {
    const r = parseDeckCode(code, byDbf);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.deck).toMatchObject({ playerClass: "WARRIOR", format: "STANDARD", size: 5, cards: [[100, 2], [101, 1], [200, 2]] });
    const reordered = encode({ cards: [[101, 1], [100, 2], [200, 2]], heroes: [7], format: 2 });
    const again = parseDeckCode(reordered, byDbf);
    expect(again.ok && again.deck.deckstring).toBe(r.deck.deckstring);
  });

  it("falls back to the class cards when the hero is unknown", () => {
    const r = parseDeckCode(encode({ cards: [[100, 2], [200, 2]], heroes: [99999], format: 1 }), byDbf);
    expect(r.ok && [r.deck.playerClass, r.deck.format]).toEqual(["WARRIOR", "WILD"]);
  });

  it("explains what is wrong", () => {
    expect(parseDeckCode("   ", byDbf)).toEqual({ ok: false, error: "empty" });
    expect(parseDeckCode("hello there", byDbf)).toEqual({ ok: false, error: "invalid" });
    expect(parseDeckCode("AAAAAAAAAAAAAAAAAAAA", byDbf)).toEqual({ ok: false, error: "invalid" });
    expect(parseDeckCode(encode({ cards: [[100, 1], [555, 2]], heroes: [7], format: 2 }), byDbf)).toEqual({ ok: false, error: "unknownCards", missing: [555] });
    expect(parseDeckCode(encode({ cards: [[200, 2]], heroes: [99999], format: 2 }), byDbf)).toEqual({ ok: false, error: "unknownClass" });
  });

  it("builds a mana curve with 7+ in the last bucket", () => {
    expect(manaCurve([{ cost: 1, count: 2 }, { cost: 9, count: 1 }, { cost: null, count: 1 }, { cost: 7, count: 2 }])).toEqual([1, 2, 0, 0, 0, 0, 0, 3]);
  });
});
