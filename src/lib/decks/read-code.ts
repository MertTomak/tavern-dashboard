import { cardByDbf, tileCardsByDbf } from "@/lib/cards/catalog";
import { classLabel } from "@/lib/cards/class-colors";
import { parseDeckCode, type ParsedDeck } from "@/lib/cards/deck-code";
import { t } from "@/i18n";

/** Parses pasted deck text against the local card data, with a user-facing message on failure. */
export function readDeckCode(text: string): { ok: true; deck: ParsedDeck } | { ok: false; message: string } {
  const r = parseDeckCode(text, cardByDbf);
  if (r.ok) return r;
  return { ok: false, message: t.decks.errors[r.error] };
}

export function defaultDeckName(name: string | null, playerClass: string, format: ParsedDeck["format"]): string {
  return name ?? t.decks.defaultName(t.filters.formats[format], classLabel(playerClass));
}

export { tileCardsByDbf };
