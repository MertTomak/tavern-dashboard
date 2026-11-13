import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { playableClasses } from "@/lib/cards/catalog";
import { createManualGame } from "@/lib/db/queries/games";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { publish } from "@/lib/live/events";
import { gameCreateSchema } from "@/lib/validation/games";
import { t } from "@/i18n";

/** POST adds a game by hand (Quick add). Open pages refresh and show it. */
export async function POST(req: Request) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const parsed = gameCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: t.quickAdd.invalid }, { status: 400 });
  const input = parsed.data;
  const classes = playableClasses();
  if (!classes.includes(input.playerClass) || !classes.includes(input.opponentClass)) return NextResponse.json({ error: t.quickAdd.invalid }, { status: 400 });
  try {
    const saved = createManualGame(input);
    if (!saved) return NextResponse.json({ error: t.quickAdd.deckGone }, { status: 409 });
    revalidatePath("/", "layout");
    publish({ type: "games:changed", added: [{ result: input.result, playerClass: input.playerClass, opponentClass: input.opponentClass }] });
    return NextResponse.json(saved, { status: 201 });
  } catch {
    return NextResponse.json({ error: t.quickAdd.failed }, { status: 500 });
  }
}
