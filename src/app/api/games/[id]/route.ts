import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { deleteGame, updateGame } from "@/lib/db/queries/games";
import { publish } from "@/lib/live/events";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { gamePatchSchema } from "@/lib/validation/games";

type Ctx = { params: Promise<{ id: string }> };

const ID = /^[0-9a-f-]{36}$/;

function changed() {
  revalidatePath("/", "layout");
  publish({ type: "games:changed", added: [] });
}

/** PATCH edits a game's deck, rank or notes. */
export async function PATCH(req: Request, ctx: Ctx) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = gamePatchSchema.safeParse(await req.json().catch(() => null));
  if (!ID.test(id) || !parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    if (!updateGame(id, parsed.data)) return NextResponse.json({ error: "That game or deck no longer exists." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not save the game." }, { status: 500 });
  }
  changed();
  return NextResponse.json({ ok: true });
}

/** DELETE removes a game for good (the page asks first). */
export async function DELETE(req: Request, ctx: Ctx) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { id } = await ctx.params;
  if (!ID.test(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    if (!deleteGame(id)) return NextResponse.json({ error: "That game no longer exists." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not delete the game." }, { status: 500 });
  }
  changed();
  return NextResponse.json({ ok: true });
}
