/**
 * Matches a game to one of the user's decks by the cards they were seen with
 * (mulligan, draws and plays). Pure, so it is easy to test and rerun.
 */

export type DeckCandidate = { deckId: number; versionId: number; format: string; cards: Set<number> };

/** Share of the game's distinct cards that must be in the deck. */
export const MATCH_THRESHOLD = 0.8;
/** Fewer distinct cards than this is too little to tell decks apart. */
export const MIN_CARDS = 4;

export function bestDeckMatch(format: string | null, seen: readonly number[], candidates: readonly DeckCandidate[]): DeckCandidate | null {
  const distinct = [...new Set(seen)];
  if (distinct.length < MIN_CARDS) return null;
  let best: { c: DeckCandidate; score: number } | null = null;
  for (const c of candidates) {
    if (format && c.format !== format) continue;
    const score = distinct.filter((d) => c.cards.has(d)).length / distinct.length;
    // Ties go to the newer version (higher id): the deck as it is played now.
    if (score >= MATCH_THRESHOLD && (!best || score > best.score || (score === best.score && c.versionId > best.c.versionId))) best = { c, score };
  }
  return best?.c ?? null;
}
