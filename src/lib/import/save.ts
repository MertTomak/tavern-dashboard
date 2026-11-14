import { revalidatePath } from "next/cache";
import { saveParsedGames, type SaveResult } from "@/lib/db/queries/import";
import type { DeckRef } from "@/lib/db/queries/decks";
import { deckForGame } from "@/lib/decks/from-game";
import { publish } from "@/lib/live/events";
import { isBattlegrounds, type GameRecord } from "@/lib/parser/record";

/** Battlegrounds is not tracked (the user doesn't play it); the parser still reads those games without failing. */
export function trackable(records: readonly GameRecord[]): { keep: GameRecord[]; dropped: number } {
  const keep = records.filter((r) => !isBattlegrounds(r.mode));
  return { keep, dropped: records.length - keep.length };
}

/** Saves games, then tells open pages (SSE) and refreshes cached pages. */
export function saveAndAnnounce(records: readonly GameRecord[], opts: Parameters<typeof saveParsedGames>[1]): SaveResult {
  // Decks named in Decks.log are saved (or found) first, outside the games' transaction.
  const decks = new Map<string, DeckRef>();
  for (const r of records) {
    const deck = deckForGame(r);
    if (deck) decks.set(r.sourceHash, deck);
  }
  const result = saveParsedGames(records, { ...opts, decks });
  if (result.imported > 0) {
    revalidatePath("/", "layout");
    publish({
      type: "games:changed",
      added: result.saved.map((g) => ({ result: g.result, playerClass: g.playerClass, opponentClass: g.opponentClass })),
    });
  }
  return result;
}
