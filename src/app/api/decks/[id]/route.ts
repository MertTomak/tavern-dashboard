import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { deleteDeck } from "@/lib/db/queries/decks";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { publish } from "@/lib/live/events";
import { t } from "@/i18n";

/** DELETE removes a deck and its versions; its games stay, without a deck. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    if (!deleteDeck(id)) return NextResponse.json({ error: t.decks.errors.notFound }, { status: 404 });
  } catch {
    return NextResponse.json({ error: t.decks.deleteFailed }, { status: 500 });
  }
  revalidatePath("/", "layout");
  publish({ type: "games:changed", added: [] });
  return NextResponse.json({ ok: true });
}
