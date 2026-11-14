import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CARDS_DIR } from "@/lib/paths";
import { loadCards } from "./classes";

/**
 * Every card, not only collectible ones: tokens, generated cards and The Coin
 * that the opponent can play. Kept small (only the fields the tracker shows).
 * Written by `npm run cards:sync`; falls back to the collectible list.
 */
export const ALL_CARDS_FILE = path.join(CARDS_DIR, "cards.all.json");

const cardSchema = z.object({
  id: z.string(),
  dbfId: z.number(),
  name: z.string(),
  cost: z.number().optional(),
  type: z.string().optional(),
  cardClass: z.string().optional(),
  rarity: z.string().optional(),
});
export const allCardsSchema = z.array(cardSchema);
export type AnyCard = z.infer<typeof cardSchema>;

export type CardIndex = { byId: (cardId: string) => AnyCard | undefined; byDbf: (dbfId: number) => AnyCard | undefined };

export function indexCards(cards: readonly AnyCard[]): CardIndex {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const byDbf = new Map(cards.map((c) => [c.dbfId, c]));
  return { byId: (id) => byId.get(id), byDbf: (dbf) => byDbf.get(dbf) };
}

export function loadAllCards(): CardIndex {
  try {
    return indexCards(allCardsSchema.parse(JSON.parse(fs.readFileSync(ALL_CARDS_FILE, "utf8"))));
  } catch {
    return indexCards(loadCards() ?? []);
  }
}
