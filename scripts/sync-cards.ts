import fs from "node:fs";
import { CARDS_DIR, CARDS_FILE, cardsSchema, deriveClasses } from "../src/lib/cards/classes";

const URL = "https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json";

async function main() {
  console.log("Downloading card data...");
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const cards = cardsSchema.parse(await res.json());
  fs.mkdirSync(CARDS_DIR, { recursive: true });
  fs.writeFileSync(CARDS_FILE, JSON.stringify(cards));
  const classes = deriveClasses(cards);
  console.log(`Saved ${cards.length} cards. Classes (${classes.length}): ${classes.join(", ")}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
