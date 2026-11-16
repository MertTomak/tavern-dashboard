import { NextResponse } from "next/server";
import { connection } from "next/server";
import { listDecks } from "@/lib/db/queries/decks";

/**
 * GET → the user's saved decks with their newest list, for the tracker's
 * "Pick your deck" fallback (when Hearthstone wrote no deck code for a game).
 */
export async function GET() {
  await connection();
  return NextResponse.json({ decks: listDecks().map((d) => ({ id: d.id, name: d.name, playerClass: d.playerClass, cards: d.cards })) });
}
