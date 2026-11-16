/**
 * Opponent archetypes: a named group of signature cards for one class
 * ("Aggro Paladin"). A game belongs to the archetype whose signature cards the
 * opponent showed most, once at least `minMatches` of them were seen.
 */

export type ArchetypeRule = {
  id: number;
  name: string;
  playerClass: string;
  signatureCards: readonly number[];
  minMatches: number;
};

/** A card's identity for matching: its name, so reprints (Classic, Core, Legacy …) of one card count as the same card. */
export type CardKey = number | string;

export type ArchetypeMatch = { id: number; name: string; matches: number };

/**
 * The opponent's archetype from the cards they played or revealed (copies
 * count once). Only archetypes of their class compete. The most matched
 * signature cards wins; a tie goes to the archetype with the larger share of
 * its signature matched, then the older rule. Null = "Unknown {Class}".
 * `key` maps a dbfId to the card's identity (see CardKey); `cards` are given
 * as keys already. Without it, dbfIds are compared as they are.
 */
export function classifyArchetype(opponentClass: string, cards: Iterable<CardKey>, rules: readonly ArchetypeRule[], key: (dbfId: number) => CardKey = (id) => id): ArchetypeMatch | null {
  const seen = new Set(cards);
  let best: (ArchetypeMatch & { share: number }) | null = null;
  for (const r of rules) {
    if (r.playerClass !== opponentClass) continue;
    const signature = new Set(r.signatureCards.map(key));
    if (!signature.size) continue;
    let matches = 0;
    for (const id of signature) if (seen.has(id)) matches++;
    if (matches < Math.max(1, r.minMatches)) continue;
    const share = matches / signature.size;
    if (!best || matches > best.matches || (matches === best.matches && (share > best.share || (share === best.share && r.id < best.id)))) {
      best = { id: r.id, name: r.name, matches, share };
    }
  }
  return best && { id: best.id, name: best.name, matches: best.matches };
}

/** Matchup column key for an opponent: their archetype id, or "unknown:CLASS" when none fits. */
export function archetypeKey(archetypeId: number | null, opponentClass: string): string {
  return archetypeId === null ? `unknown:${opponentClass}` : String(archetypeId);
}
