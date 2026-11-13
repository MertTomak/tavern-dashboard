import { NextResponse } from "next/server";
import { findDeckByDeckstring, listDeckOptions } from "@/lib/db/queries/decks";
import { isTrustedRequest } from "@/lib/http/same-origin";
import { defaultDeckName, readDeckCode, tileCardsByDbf } from "@/lib/decks/read-code";
import { deckPreviewSchema } from "@/lib/validation/decks";
import { t } from "@/i18n";

/** POST { text } reads a pasted deck code and shows what would be saved. Nothing is written. */
export async function POST(req: Request) {
  if (!isTrustedRequest(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const parsed = deckPreviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: t.decks.errors.invalid }, { status: 400 });
  try {
    const r = readDeckCode(parsed.data.text);
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 422 });
    const tiles = tileCardsByDbf(r.deck.cards.map(([id]) => id));
    return NextResponse.json({
      name: defaultDeckName(r.deck.name, r.deck.playerClass, r.deck.format),
      playerClass: r.deck.playerClass,
      format: r.deck.format,
      size: r.deck.size,
      cards: r.deck.cards.flatMap(([dbfId, count]) => {
        const card = tiles.get(dbfId);
        return card ? [{ dbfId, count, card }] : [];
      }),
      duplicate: findDeckByDeckstring(r.deck.deckstring)?.name ?? null,
      sameClass: listDeckOptions().filter((d) => d.playerClass === r.deck.playerClass).map((d) => ({ id: d.id, name: d.name })),
    });
  } catch {
    return NextResponse.json({ error: t.decks.errors.failed }, { status: 500 });
  }
}
