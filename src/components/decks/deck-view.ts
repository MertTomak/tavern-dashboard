import { effectiveClassArt, pickSignatureCard, cardsByDbf } from "@/lib/cards/catalog";
import { winRate, type WinRate } from "@/lib/stats/winrate";
import type { DeckSummary } from "@/lib/db/queries/decks";

/** What a deck card shows: its signature card's art (else the class art) and its record. */
export function deckView(d: DeckSummary, classArtChoices: Record<string, string>): { art: string | null; artName: string | null; wr: WinRate } {
  const sig = pickSignatureCard(cardsByDbf(d.cards.map((c) => c.dbfId)), d.playerClass);
  return { art: sig?.id ?? effectiveClassArt(d.playerClass, classArtChoices), artName: sig?.name ?? null, wr: winRate(d.results) };
}
