import { NextResponse } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { trackerDeckMatch } from "@/lib/db/queries/decks";

const querySchema = z.object({
  class: z.string().regex(/^[A-Z_]{2,30}$/),
  dbf: z.string().regex(/^\d+(,\d+){0,59}$/),
});

/**
 * GET ?class=MAGE&dbf=1,2,3 → the saved deck the tracker should count down when
 * Hearthstone wrote no deck code: the one that fits the cards seen so far, or null.
 */
export async function GET(req: Request) {
  await connection();
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  return NextResponse.json({ deck: trackerDeckMatch(parsed.data.class, parsed.data.dbf.split(",").map(Number)) });
}
