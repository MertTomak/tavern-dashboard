import { decode, encode, type FormatType } from "deckstrings";
import type { GAME_FORMATS } from "@/lib/db/schema";
import type { Card } from "./classes";

/**
 * Reads a deck code as Hearthstone copies it (a comment block with "### Name",
 * the code line, and a footer) or as a bare code. Pure: card data comes in.
 */

const FORMATS: Record<FormatType, (typeof GAME_FORMATS)[number]> = { 1: "WILD", 2: "STANDARD", 3: "CLASSIC", 4: "TWIST" };

export type ParsedDeck = {
  name: string | null;
  playerClass: string;
  format: (typeof GAME_FORMATS)[number];
  /** [dbfId, count], sorted by dbfId. Sideboard cards (E.T.C., Zilliax modules) are kept in the code only. */
  cards: [number, number][];
  /** The code re-encoded in a canonical order, so the same list always gives the same string. */
  deckstring: string;
  size: number;
};

export type DeckCodeError = "empty" | "invalid" | "unknownClass" | "unknownCards";

export type DeckCodeResult = { ok: true; deck: ParsedDeck } | { ok: false; error: DeckCodeError; missing?: number[] };

const CODE_LINE = /^[A-Za-z0-9+/]{12,}={0,2}$/;

/** The code and the name from pasted text. */
export function extractDeckCode(text: string): { code: string | null; name: string | null } {
  let code: string | null = null;
  let name: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("###")) name ??= line.replace(/^#+\s*/, "").trim() || null;
    else if (!line.startsWith("#") && CODE_LINE.test(line)) code ??= line;
  }
  return { code, name };
}

export function parseDeckCode(text: string, cardByDbf: (dbfId: number) => Card | undefined): DeckCodeResult {
  const { code, name } = extractDeckCode(text);
  if (!code) return { ok: false, error: text.trim() ? "invalid" : "empty" };

  let decoded: ReturnType<typeof decode>;
  try {
    decoded = decode(code);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (!decoded.cards.length || !FORMATS[decoded.format]) return { ok: false, error: "invalid" };

  const missing = decoded.cards.map(([id]) => id).filter((id) => !cardByDbf(id));
  if (missing.length) return { ok: false, error: "unknownCards", missing };

  // The hero names the class; if it is a hero this card data does not know, the deck's class cards do.
  let playerClass = cardByDbf(decoded.heroes[0] ?? 0)?.cardClass ?? null;
  if (!playerClass || playerClass === "NEUTRAL") {
    const counts = new Map<string, number>();
    for (const [id, n] of decoded.cards) {
      const cls = cardByDbf(id)?.cardClass;
      if (cls && cls !== "NEUTRAL") counts.set(cls, (counts.get(cls) ?? 0) + n);
    }
    playerClass = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
  if (!playerClass) return { ok: false, error: "unknownClass" };

  const cards = [...decoded.cards].sort((a, b) => a[0] - b[0]);
  const sideboardCards = [...decoded.sideboardCards].sort((a, b) => a[2] - b[2] || a[0] - b[0]);
  const deckstring = encode({ cards, heroes: decoded.heroes, format: decoded.format, sideboardCards });
  return {
    ok: true,
    deck: { name, playerClass, format: FORMATS[decoded.format], cards, deckstring, size: cards.reduce((s, [, n]) => s + n, 0) },
  };
}

/** Mana curve buckets 0 … 7+ (count of cards at each cost). */
export function manaCurve(cards: readonly { cost: number | null; count: number }[]): number[] {
  const curve = Array.from({ length: 8 }, () => 0);
  for (const c of cards) curve[Math.min(7, Math.max(0, c.cost ?? 0))] += c.count;
  return curve;
}
