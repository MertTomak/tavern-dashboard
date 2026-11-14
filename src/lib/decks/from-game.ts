import { deckIdByName, deckVersionByDeckstring, saveDeck, type DeckRef } from "@/lib/db/queries/decks";
import type { GameRecord } from "@/lib/parser/record";
import { defaultDeckName, readDeckCode } from "./read-code";

/** Modes whose deck is one of the user's own constructed decks (Arena drafts are not saved as decks). */
const OWN_DECK_MODES = new Set<GameRecord["mode"]>(["RANKED", "CASUAL", "FRIENDLY"]);

/**
 * The deck a watched game was played with, from the code Hearthstone wrote to
 * Decks.log: the saved version holding exactly that list, else a new version of
 * the deck with the same name and class, else a new deck. Null when the game has
 * no usable code (then the usual match on cards seen applies).
 */
export function deckForGame(record: GameRecord): DeckRef | null {
  if (!record.deck || !OWN_DECK_MODES.has(record.mode)) return null;
  const parsed = readDeckCode(record.deck.code);
  if (!parsed.ok || parsed.deck.playerClass !== record.playerClass) return null;
  const known = deckVersionByDeckstring(parsed.deck.deckstring);
  if (known) return known;
  const name = record.deck.name ?? defaultDeckName(parsed.deck.name, parsed.deck.playerClass, parsed.deck.format);
  const saved = saveDeck(parsed.deck, { name, versionOf: deckIdByName(name, parsed.deck.playerClass) });
  if ("error" in saved) return null;
  return deckVersionByDeckstring(parsed.deck.deckstring);
}
