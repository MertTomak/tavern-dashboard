import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { saveDeck } from "@/lib/db/queries/decks";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { publish } from "@/lib/live/events";
import { readDeckCode } from "@/lib/decks/read-code";
import { deckSaveSchema } from "@/lib/validation/decks";
import { t } from "@/i18n";

/** POST { text, name, versionOf } saves a pasted deck (or a new version) and re-matches that class's games. */
export async function POST(req: Request) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const parsed = deckSaveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: t.decks.errors.invalid }, { status: 400 });
  try {
    const r = readDeckCode(parsed.data.text);
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 422 });
    const saved = saveDeck(r.deck, { name: parsed.data.name, versionOf: parsed.data.versionOf });
    if ("error" in saved) {
      const message = saved.error === "duplicate" ? t.decks.errors.duplicate(saved.name) : t.decks.errors.notFound;
      return NextResponse.json({ error: message }, { status: 409 });
    }
    revalidatePath("/", "layout");
    if (saved.matched) publish({ type: "games:changed", added: [] });
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: t.decks.errors.failed }, { status: 500 });
  }
}
