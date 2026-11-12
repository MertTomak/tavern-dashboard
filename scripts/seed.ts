import { randomUUID } from "node:crypto";
import { encode } from "deckstrings";
import { db } from "../src/lib/db/client";
import { deckCards, deckVersions, decks, games, importBatches } from "../src/lib/db/schema";
import { SEED_BATCH_NAME } from "../src/lib/db/queries/demo";
import { loadCards, deriveClasses, type Card } from "../src/lib/cards/classes";
import { backupDb } from "./backup-db";

// Small deterministic PRNG so demo data is reproducible.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261112);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

function weighted<T>(items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

function buildDeck(cards: Card[], playerClass: string): { deckstring: string; cards: [number, number][] } {
  const hero = cards.find((c) => c.type === "HERO" && c.cardClass === playerClass);
  if (!hero) throw new Error(`Hero not found: ${playerClass}`);
  const pool = cards.filter(
    (c) => c.type !== "HERO" && (c.cardClass === playerClass || c.cardClass === "NEUTRAL"),
  );
  const chosen = new Map<number, number>();
  while ([...chosen.values()].reduce((s, n) => s + n, 0) < 30) {
    const c = pick(pool);
    const n = chosen.get(c.dbfId) ?? 0;
    if (n < 2) chosen.set(c.dbfId, n + 1);
  }
  const list = [...chosen.entries()].sort((a, b) => a[0] - b[0]);
  return { deckstring: encode({ cards: list, heroes: [hero.dbfId], format: 2 }), cards: list };
}

function main() {
  const cards = loadCards();
  if (!cards) throw new Error("No card data. Run `npm run cards:sync` first.");
  const classes = deriveClasses(cards);

  const existing = db.select({ id: games.id }).from(games).limit(1).all();
  if (existing.length > 0) {
    console.log("The database already has games, so no demo data was added (to protect your data).");
    return;
  }
  const backup = backupDb();
  if (backup) console.log(`Backup created: ${backup}`);

  const deckDefs = [
    { name: "Aggro Paladin", cls: "PALADIN", strength: 0.57 },
    { name: "Control Warrior", cls: "WARRIOR", strength: 0.5 },
    { name: "Tempo Mage", cls: "MAGE", strength: 0.53 },
    { name: "Zoo Warlock", cls: "WARLOCK", strength: 0.46 },
    { name: "Midrange Druid", cls: "DRUID", strength: 0.55 },
  ].filter((d) => classes.includes(d.cls));

  const created = deckDefs.map((def) => {
    const built = buildDeck(cards, def.cls);
    const deck = db
      .insert(decks)
      .values({ name: def.name, playerClass: def.cls, format: "STANDARD", isDemo: true })
      .returning()
      .get();
    const version = db
      .insert(deckVersions)
      .values({ deckId: deck.id, versionNo: 1, deckstring: built.deckstring })
      .returning()
      .get();
    db.insert(deckCards)
      .values(built.cards.map(([dbfId, count]) => ({ deckVersionId: version.id, dbfId, count })))
      .run();
    return { ...def, deckId: deck.id, versionId: version.id };
  });

  const batch = db
    .insert(importBatches)
    .values({ source: "MANUAL", fileName: SEED_BATCH_NAME, imported: 300 })
    .returning()
    .get();

  const modeWeights = [
    ["RANKED", 70],
    ["CASUAL", 12],
    ["BRAWL", 6],
    ["FRIENDLY", 6],
    ["ARENA", 6],
  ] as const;

  const total = 300;
  const end = Date.now();
  const start = end - 45 * 24 * 3600 * 1000;
  const times = Array.from({ length: total }, () => start + rand() * (end - start)).sort((a, b) => a - b);

  let rank = 40; // numeric rank index, see stats rules
  const rows = times.map((t, i) => {
    const mode = weighted(modeWeights);
    const deck = pick(created);
    const opponent = pick(classes);
    const wentFirst = rand() < 0.5;
    const matchupAdj = opponent === "WARRIOR" ? -0.08 : opponent === "HUNTER" ? 0.05 : 0;
    const winProb = Math.min(0.9, Math.max(0.1, deck.strength + matchupAdj));
    const roll = rand();
    const result = roll < 0.015 ? "TIE" : roll < 0.015 + (1 - 0.015) * winProb ? "WIN" : "LOSS";
    const ranked = mode === "RANKED";
    const rankBefore = ranked ? rank : null;
    if (ranked) rank = Math.min(50, Math.max(0, rank + (result === "WIN" ? 1 : result === "LOSS" ? -0.6 : 0)));
    const turns = 5 + Math.floor(rand() * 11);
    return {
      id: randomUUID(),
      playedAt: new Date(t).toISOString(),
      mode,
      format: mode === "ARENA" ? null : ("STANDARD" as const),
      result: result as "WIN" | "LOSS" | "TIE",
      playerClass: deck.cls,
      opponentClass: opponent,
      deckId: ranked || mode === "CASUAL" ? deck.deckId : null,
      deckVersionId: ranked || mode === "CASUAL" ? deck.versionId : null,
      wentFirst,
      turns,
      durationSec: turns * (35 + Math.floor(rand() * 40)),
      rankBefore,
      rankAfter: ranked ? rank : null,
      source: "MANUAL" as const,
      sourceHash: `seed-${i}`,
      importBatchId: batch.id,
    };
  });

  db.insert(games).values(rows).run();
  console.log(`Added ${created.length} demo decks and ${rows.length} demo games.`);
}

main();
