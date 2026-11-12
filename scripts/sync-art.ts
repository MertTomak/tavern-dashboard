// Downloads the card art the app shows today into data/art/ so it also works offline:
// every class portrait, plus the tile, render and art of every card in your decks.
// Anything not covered here is still fetched on first view and cached.
import { getArt } from "../src/lib/cards/art-cache";
import { buildHeroMap } from "../src/lib/cards/catalog";
import { loadCards } from "../src/lib/cards/classes";
import { db } from "../src/lib/db/client";
import { deckCards } from "../src/lib/db/schema";
import type { ArtKind } from "../src/lib/cards/art";

async function main() {
  const cards = loadCards();
  if (!cards) throw new Error("No card data. Run `npm run cards:sync` first.");
  const byDbf = new Map(cards.map((c) => [c.dbfId, c]));
  const jobs: [ArtKind, string][] = [];
  for (const heroId of buildHeroMap(cards).values()) jobs.push(["art", heroId]);
  const dbfIds = new Set(db.select({ dbfId: deckCards.dbfId }).from(deckCards).all().map((r) => r.dbfId));
  for (const dbfId of dbfIds) {
    const card = byDbf.get(dbfId);
    if (!card) continue;
    for (const kind of ["tile", "render", "art"] as const) jobs.push([kind, card.id]);
  }

  let ok = 0;
  let missing = 0;
  const queue = [...jobs];
  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      if (await getArt(job[0], job[1])) ok++;
      else missing++;
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`Card art ready: ${ok} images cached in data/art/, ${missing} unavailable.`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
