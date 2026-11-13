import { describe, expect, it } from "vitest";
import { bestDeckMatch, type DeckCandidate } from "@/lib/import/deck-match";

const deck = (versionId: number, cards: number[], format = "STANDARD"): DeckCandidate => ({ deckId: versionId, versionId, format, cards: new Set(cards) });

describe("bestDeckMatch", () => {
  const zoo = deck(1, [1, 2, 3, 4, 5, 6, 7, 8]);
  const control = deck(2, [10, 11, 12, 13, 14, 15]);

  it("picks the deck that contains the cards seen", () => {
    expect(bestDeckMatch("STANDARD", [1, 2, 3, 4, 5], [zoo, control])?.versionId).toBe(1);
  });

  it("returns nothing below the threshold or with too few cards", () => {
    expect(bestDeckMatch("STANDARD", [1, 2, 10, 11, 12], [zoo, control])).toBeNull();
    expect(bestDeckMatch("STANDARD", [1, 2, 3], [zoo])).toBeNull();
  });

  it("ignores decks of another format and prefers the newer version on a tie", () => {
    expect(bestDeckMatch("WILD", [1, 2, 3, 4], [zoo])).toBeNull();
    expect(bestDeckMatch("STANDARD", [1, 2, 3, 4], [zoo, deck(3, [1, 2, 3, 4, 9])])?.versionId).toBe(3);
  });
});
