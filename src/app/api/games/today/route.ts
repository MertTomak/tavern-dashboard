import { NextResponse } from "next/server";
import { connection } from "next/server";
import { TIME_ZONE } from "@/i18n";
import { getOverviewGames } from "@/lib/db/queries/overview";
import { rangeStart } from "@/lib/filters";
import { winRate } from "@/lib/stats/winrate";

/** GET → today's record (Europe/Istanbul day), for the Mac app's menu bar. */
export async function GET() {
  await connection();
  const games = getOverviewGames({ from: rangeStart("today", new Date(), TIME_ZONE) });
  const { wins, losses, ties } = winRate(games.map((g) => g.result));
  return NextResponse.json({ wins, losses, ties });
}
