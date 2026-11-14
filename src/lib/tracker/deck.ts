import { decode } from "deckstrings";
import type { TrackerDeck } from "./view";

/** A deck code from Decks.log as the list the tracker counts down. Null if the code cannot be read. */
export function deckFromCode(code: string, name: string | null): TrackerDeck | null {
  try {
    const { cards } = decode(code);
    if (!cards.length) return null;
    return { name, source: "code", cards: cards.map(([dbfId, count]) => ({ dbfId, count })) };
  } catch {
    return null;
  }
}
