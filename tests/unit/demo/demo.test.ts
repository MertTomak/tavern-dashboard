import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import { indexCards } from "@/lib/cards/all-cards";
import type { Card } from "@/lib/cards/classes";
import * as schema from "@/lib/db/schema";
import { demoAnchor, fillDemoDatabase } from "@/lib/demo/dataset";
import { fixtureLines } from "@/lib/demo/fixture";
import { buildReplay, recordedDeck } from "@/lib/demo/replay";
import { RECORDED_DECK } from "@/lib/demo/recorded-deck";

const DIR = path.join(process.cwd(), "tests/fixtures/power-logs");
const FIXTURE = JSON.parse(fs.readFileSync(path.join(DIR, "cards.json"), "utf8")) as Record<string, number>;
const HERO_CLASS: Record<string, string> = { HERO_06: "DRUID", HERO_07: "WARLOCK", HERO_07ax: "WARLOCK", HERO_07cg: "WARLOCK" };

// Made-up card data: a hero and 40 cards per class, the fixture's cards and the recorded deck (as Warlock cards).
const CLASSES = ["DRUID", "HUNTER", "MAGE", "PALADIN", "PRIEST", "WARLOCK", "WARRIOR"];
let next = 900_000;
const cards: Card[] = [
  ...CLASSES.flatMap((cls, c) => [
    { id: `HERO_${c}`, dbfId: next++, name: `${cls} hero`, cardClass: cls, type: "HERO" },
    ...Array.from({ length: 40 }, (_, i) => ({ id: `${cls}_${i}`, dbfId: next++, name: `${cls} card ${i}`, cardClass: cls, type: "MINION", cost: i % 7, rarity: i % 9 ? "COMMON" : "LEGENDARY" })),
  ]),
  ...Array.from({ length: 30 }, (_, i) => ({ id: `NEUTRAL_${i}`, dbfId: next++, name: `Neutral ${i}`, cardClass: "NEUTRAL", type: "MINION", cost: i % 6, rarity: "COMMON" })),
  ...Object.entries(FIXTURE).map(([id, dbfId]) => ({ id, dbfId, name: `Card ${id}`, cardClass: HERO_CLASS[id] ?? "WARLOCK", type: id.startsWith("HERO_") ? "HERO" : "MINION", cost: 2 })),
  ...RECORDED_DECK.cards.filter(([id]) => !(id in FIXTURE)).map(([id]) => ({ id, dbfId: next++, name: `Card ${id}`, cardClass: "WARLOCK", type: "MINION", cost: 3 })),
];

function demoDb(anchor: number) {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  migrate(drizzle(sqlite), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const db = drizzle(sqlite, { schema });
  const summary = fillDemoDatabase(db, cards, anchor);
  sqlite.pragma("query_only = ON");
  return { sqlite, db, summary };
}

const ANCHOR = demoAnchor(Date.parse("2026-11-17T10:42:00Z"));

describe("demo dataset", () => {
  it("anchors on the start of the hour", () => {
    expect(new Date(ANCHOR).toISOString()).toBe("2026-11-17T10:00:00.000Z");
  });

  it("is the same every time it is built, ids included", () => {
    const a = demoDb(ANCHOR).sqlite.prepare("SELECT id, played_at, result FROM games ORDER BY id").all();
    const b = demoDb(ANCHOR).sqlite.prepare("SELECT id, played_at, result FROM games ORDER BY id").all();
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(300);
  });

  it("holds generated games, the three recorded ones and archetypes, all in the past", () => {
    const { db, summary } = demoDb(ANCHOR);
    expect(summary.recorded).toBe(3);
    const row = db.select({ n: sql<number>`count(*)`, last: sql<string>`max(played_at)`, sorted: sql<number>`count(opponent_archetype_id)` }).from(schema.games).get()!;
    expect(row.n).toBe(summary.games);
    expect(Date.parse(row.last)).toBeLessThan(ANCHOR);
    expect(row.sorted).toBeGreaterThan(0);
    const recorded = db.select({ n: sql<number>`count(*)` }).from(schema.games).where(sql`source_hash NOT LIKE 'demo:%'`).get()!;
    expect(recorded.n).toBe(3);
  });

  it("is read-only once built", () => {
    const { db } = demoDb(ANCHOR);
    expect(() => db.insert(schema.preferences).values({ key: "k", value: "v" }).run()).toThrow(/readonly/);
  });
});

describe("tracker replay of the recorded log", () => {
  const index = indexCards(cards);
  const games = buildReplay(fixtureLines(), index, recordedDeck(index));

  it("has the three finished games, timed from the start of each", () => {
    expect(games).toHaveLength(3);
    for (const g of games) {
      expect(g.me).toBe("WARLOCK");
      expect(g.frames[0].at).toBe(0);
      expect(g.frames.at(-1)!.view.status).toBe("over");
      expect(g.frames.every((f, i) => i === 0 || f.at >= g.frames[i - 1].at)).toBe(true);
      expect(g.durationMs).toBeGreaterThan(60_000);
    }
  });

  it("counts the recorded deck down and shows only the opponent's public cards", () => {
    for (const g of games) {
      for (const { view } of g.frames) {
        expect(view.deck.source).toBe("match");
        expect(view.me.rows.reduce((n, r) => n + (r.total ?? 0), 0)).toBe(30);
        // Only counts about the opponent's hand, never its cards.
        expect(Object.keys(view.opponent).sort()).toEqual(["cls", "deckCount", "handCount", "rows", "unrevealed"]);
        for (const row of view.opponent.rows) expect(Object.keys(row).sort()).toEqual(["cardId", "cost", "count", "dbfId", "keys", "name", "rarity"]);
      }
    }
  });
});
