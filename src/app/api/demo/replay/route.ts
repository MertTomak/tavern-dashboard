import { NextResponse } from "next/server";
import { loadAllCards } from "@/lib/cards/all-cards";
import { fixtureLines } from "@/lib/demo/fixture";
import { buildReplay, recordedDeck, type ReplayGame } from "@/lib/demo/replay";

let cached: ReplayGame[] | null = null;

/**
 * GET /api/demo/replay → the recorded fixture games as timed tracker views,
 * for the "Replay a game" page. The log is anonymised and part of the repo;
 * nothing of the user's is read.
 */
export function GET() {
  try {
    if (!cached) {
      const cards = loadAllCards();
      cached = buildReplay(fixtureLines(), cards, recordedDeck(cards));
    }
    return NextResponse.json({ games: cached }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "The recorded game could not be loaded." }, { status: 500 });
  }
}
