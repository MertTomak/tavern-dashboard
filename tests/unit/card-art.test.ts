import { describe, expect, it } from "vitest";
import { buildHeroMap, pickSignatureCard } from "@/lib/cards/catalog";
import { artSrc, CARD_ID_PATTERN, portraitSrc, upstreamArtUrl } from "@/lib/cards/art";
import type { Card } from "@/lib/cards/classes";

const card = (c: Partial<Card> & Pick<Card, "id">): Card => ({ dbfId: 1, name: c.id, ...c });

describe("hero portraits", () => {
  it("prefers the default HERO_NN card for each class", () => {
    const map = buildHeroMap([
      card({ id: "CORE_ICC_833", type: "HERO", cardClass: "MAGE" }),
      card({ id: "HERO_08", type: "HERO", cardClass: "MAGE" }),
      card({ id: "HERO_08a", type: "HERO", cardClass: "MAGE" }),
      card({ id: "EX1_001", type: "MINION", cardClass: "MAGE" }),
    ]);
    expect(map.get("MAGE")).toBe("HERO_08");
  });

  it("falls back to any hero for a new class (e.g. Monk)", () => {
    expect(buildHeroMap([card({ id: "TOY_999", type: "HERO", cardClass: "MONK" })]).get("MONK")).toBe("TOY_999");
  });
});

describe("signature card", () => {
  it("picks the rarest, then most expensive card", () => {
    const pick = pickSignatureCard(
      [
        card({ id: "A", rarity: "EPIC", cost: 9, cardClass: "MAGE" }),
        card({ id: "B", rarity: "LEGENDARY", cost: 3, cardClass: "NEUTRAL" }),
        card({ id: "C", rarity: "LEGENDARY", cost: 5, cardClass: "MAGE" }),
      ],
      "MAGE",
    );
    expect(pick?.id).toBe("C");
    expect(pickSignatureCard([], "MAGE")).toBeNull();
  });
});

describe("art urls", () => {
  it("builds HearthstoneJSON and local urls", () => {
    expect(upstreamArtUrl("tile", "EX1_001")).toBe("https://art.hearthstonejson.com/v1/tiles/EX1_001.webp");
    expect(upstreamArtUrl("render", "EX1_001")).toBe("https://art.hearthstonejson.com/v1/render/latest/enUS/256x/EX1_001.png");
    expect(upstreamArtUrl("art", "EX1_001")).toBe("https://art.hearthstonejson.com/v1/512x/EX1_001.webp");
    expect(artSrc("art", "EX1_001")).toBe("/api/art/art/EX1_001");
    expect(portraitSrc("MAGE")).toBe("/api/art/portrait/MAGE");
  });

  it("rejects ids that could escape the cache folder", () => {
    expect(CARD_ID_PATTERN.test("../../etc/passwd")).toBe(false);
    expect(CARD_ID_PATTERN.test("EX1_001")).toBe(true);
  });
});
