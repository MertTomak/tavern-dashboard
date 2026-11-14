import fs from "node:fs";
import { CARDS_DIR } from "../src/lib/paths";
import { CARDS_FILE, cardsSchema, deriveClasses } from "../src/lib/cards/classes";
import { ALL_CARDS_FILE, allCardsSchema } from "../src/lib/cards/all-cards";

const BASE = "https://api.hearthstonejson.com/v1/latest/enUS";

async function download(file: string): Promise<unknown> {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`Download of ${file} failed: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log("Downloading card data...");
  const cards = cardsSchema.parse(await download("cards.collectible.json"));
  fs.mkdirSync(CARDS_DIR, { recursive: true });
  fs.writeFileSync(CARDS_FILE, JSON.stringify(cards));
  const classes = deriveClasses(cards);
  console.log(`Saved ${cards.length} cards. Classes (${classes.length}): ${classes.join(", ")}`);

  // All cards (tokens, The Coin, generated cards) for the deck tracker, trimmed to what it shows.
  const raw = await download("cards.json");
  const all = allCardsSchema.parse(
    (Array.isArray(raw) ? raw : [])
      .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null && typeof c.name === "string" && typeof c.dbfId === "number")
      .map(({ id, dbfId, name, cost, type, cardClass, rarity }) => ({ id, dbfId, name, cost, type, cardClass, rarity })),
  );
  fs.writeFileSync(ALL_CARDS_FILE, JSON.stringify(all));
  console.log(`Saved ${all.length} cards for the deck tracker.`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
