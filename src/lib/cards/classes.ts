import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const CARDS_DIR = path.join(process.cwd(), "data", "cards");
export const CARDS_FILE = path.join(CARDS_DIR, "cards.collectible.json");

const cardSchema = z.object({
  dbfId: z.number(),
  id: z.string(),
  name: z.string(),
  cardClass: z.string().optional(),
  type: z.string().optional(),
  cost: z.number().optional(),
  rarity: z.string().optional(),
});
export const cardsSchema = z.array(cardSchema);
export type Card = z.infer<typeof cardSchema>;

/** Classes that are not playable hero classes. */
const NON_PLAYABLE = new Set(["NEUTRAL", "INVALID", "DREAM", "WHIZBANG", "DEATHKNIGHT_PLACEHOLDER"]);

/** Derives the playable class list from card data, so new classes work without code changes. */
export function deriveClasses(cards: Card[]): string[] {
  const heroClasses = new Set<string>();
  for (const card of cards) {
    if (card.type === "HERO" && card.cardClass && !NON_PLAYABLE.has(card.cardClass)) {
      heroClasses.add(card.cardClass);
    }
  }
  return [...heroClasses].sort();
}

export function loadCards(): Card[] | null {
  if (!fs.existsSync(CARDS_FILE)) return null;
  return cardsSchema.parse(JSON.parse(fs.readFileSync(CARDS_FILE, "utf8")));
}

export function loadClasses(): string[] {
  const cards = loadCards();
  return cards ? deriveClasses(cards) : [];
}
