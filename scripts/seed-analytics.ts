/**
 * Fills a TEMPORARY database with realistic generated games for trying the
 * Phase 5 analytics: decks with two versions, mulligans, draws and plays with
 * turns, opponents that play archetype cards, sessions (one ending on tilt)
 * and a ranked climb. Never runs against the real data folder.
 *
 *   TAVERN_DATA_DIR=/tmp/tavern-try npx tsx scripts/seed-analytics.ts
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { encode } from "deckstrings";
import { APP_SUPPORT_DIR, DATA_DIR } from "../src/lib/paths";

if (!process.env.TAVERN_DATA_DIR || path.resolve(DATA_DIR) === path.resolve(APP_SUPPORT_DIR)) {
  console.error("Set TAVERN_DATA_DIR to a temporary folder. This script never writes to the real data folder.");
  process.exit(1);
}

// Card data (read-only copy) and the art cache (shared, it is only a download cache).
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(path.join(DATA_DIR, "cards"))) fs.cpSync(path.join(APP_SUPPORT_DIR, "cards"), path.join(DATA_DIR, "cards"), { recursive: true });
if (!fs.existsSync(path.join(DATA_DIR, "art")) && fs.existsSync(path.join(APP_SUPPORT_DIR, "art"))) fs.symlinkSync(path.join(APP_SUPPORT_DIR, "art"), path.join(DATA_DIR, "art"));

async function main() {
  const { migrateDb } = await import("../src/lib/db/migrate");
  migrateDb(path.join(process.cwd(), "drizzle"));
  const { db } = await import("../src/lib/db/client");
  const s = await import("../src/lib/db/schema");
  const { reclassifyOpponents } = await import("../src/lib/db/queries/archetypes");
  const { loadCards, deriveClasses } = await import("../src/lib/cards/classes");

  if (db.select({ id: s.games.id }).from(s.games).limit(1).all().length) {
    console.log("This database already has games; nothing added.");
    return;
  }
  const cards = loadCards();
  if (!cards) throw new Error("No card data. Run `npm run cards:sync` first.");
  const classes = deriveClasses(cards);

  let seed = 20261117;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(a: readonly T[]): T => a[Math.floor(rand() * a.length)];
  const shuffle = <T>(a: T[]): T[] => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const pool = (cls: string, classOnly = false) =>
    cards.filter((c) => c.type !== "HERO" && c.type !== "LOCATION" && (c.cardClass === cls || (!classOnly && c.cardClass === "NEUTRAL")) && (c.cost ?? 0) <= 8);
  const hero = (cls: string) => cards.find((c) => c.type === "HERO" && c.cardClass === cls && /^HERO_\d+$/.test(c.id))?.dbfId ?? cards.find((c) => c.type === "HERO" && c.cardClass === cls)!.dbfId;
  const costOf = new Map(cards.map((c) => [c.dbfId, c.cost ?? 0]));

  function buildList(cls: string): [number, number][] {
    const options = shuffle(pool(cls).filter((c) => (c.cost ?? 0) <= 6));
    const chosen = new Map<number, number>();
    for (const c of options) {
      if ([...chosen.values()].reduce((a, b) => a + b, 0) >= 30) break;
      const n = c.rarity === "LEGENDARY" ? 1 : Math.min(2, 30 - [...chosen.values()].reduce((a, b) => a + b, 0));
      chosen.set(c.dbfId, n);
    }
    return [...chosen.entries()].sort((a, b) => a[0] - b[0]);
  }

  // My decks: Zoo Warlock with two versions, a Paladin deck with one.
  type MyDeck = { deckId: number; versionId: number; cls: string; list: [number, number][]; base: number; power: Map<number, number> };
  function saveDeck(name: string, cls: string, versions: [number, number][][], base: number[]): MyDeck[] {
    const deckId = db.insert(s.decks).values({ name, playerClass: cls, format: "STANDARD" }).returning({ id: s.decks.id }).get().id;
    return versions.map((list, i) => {
      const versionId = db
        .insert(s.deckVersions)
        .values({ deckId, versionNo: i + 1, deckstring: encode({ cards: list, heroes: [hero(cls)], format: 2 }), createdAt: new Date(Date.now() - (i ? 20 : 70) * 86_400_000).toISOString() })
        .returning({ id: s.deckVersions.id })
        .get().id;
      db.insert(s.deckCards).values(list.map(([dbfId, count]) => ({ deckVersionId: versionId, dbfId, count }))).run();
      // Each card nudges the win chance when it is in hand: a few are clearly good, a few clearly bad.
      const power = new Map(list.map(([id]) => [id, (rand() - 0.5) * 0.12]));
      return { deckId, versionId, cls, list, base: base[i], power };
    });
  }
  const warlockV1 = buildList("WARLOCK");
  // Version 2: three pairs out, three new pairs in (still 30 cards).
  const pairsOut = new Set(warlockV1.filter(([, n]) => n === 2).slice(0, 3).map(([id]) => id));
  const swapIn = pool("WARLOCK", true).filter((c) => !warlockV1.some(([id]) => id === c.dbfId) && c.rarity !== "LEGENDARY" && (c.cost ?? 0) <= 5).slice(0, 3);
  const warlockV2 = [...warlockV1.filter(([id]) => !pairsOut.has(id)), ...swapIn.map((c): [number, number] => [c.dbfId, 2])].sort((a, b) => a[0] - b[0]);
  const [zooV1, zooV2] = saveDeck("Zoo Warlock", "WARLOCK", [warlockV1, warlockV2], [0.45, 0.66]);
  const [pally] = saveDeck("Aggro Paladin", "PALADIN", [buildList("PALADIN")], [0.53]);

  // Opponent archetypes: two per common class, six signature cards each.
  const oppClasses = classes.filter((c) => ["PRIEST", "WARRIOR", "MAGE", "DRUID", "HUNTER", "ROGUE", "DEMONHUNTER", "DEATHKNIGHT", "SHAMAN"].includes(c));
  const archetypeNames: Record<string, [string, string]> = {
    PRIEST: ["Control Priest", "Zarimi Priest"],
    WARRIOR: ["Enrage Warrior", "Control Warrior"],
    MAGE: ["Spell Mage", "Elemental Mage"],
    DRUID: ["Dragon Druid", "Ramp Druid"],
    HUNTER: ["Aggro Hunter", "Discover Hunter"],
    ROGUE: ["Cycle Rogue", "Pirate Rogue"],
    DEMONHUNTER: ["Aggro Demon Hunter", "Naga Demon Hunter"],
    DEATHKNIGHT: ["Blood Death Knight", "Frost Death Knight"],
    SHAMAN: ["Evolve Shaman", "Totem Shaman"],
  };
  type Arch = { cls: string; signature: number[]; filler: number[]; edge: number };
  const arches: Arch[] = [];
  for (const cls of oppClasses) {
    const classCards = shuffle(pool(cls, true).map((c) => c.dbfId));
    archetypeNames[cls].forEach((name, i) => {
      const signature = classCards.slice(i * 6, i * 6 + 6);
      db.insert(s.archetypes).values({ name, playerClass: cls, signatureCards: signature, minMatches: 2 }).run();
      // Win-chance shift against this archetype: Enrage Warrior and Aggro Hunter are hard, Control Priest easy.
      const edge = name === "Enrage Warrior" ? -0.35 : name === "Aggro Hunter" ? -0.1 : name === "Control Priest" ? 0.35 : (rand() - 0.5) * 0.08;
      arches.push({ cls, signature, filler: classCards.slice(12, 40), edge });
    });
  }

  // Sessions over the last 90 days; the newest one ends with four losses (tilt).
  const now = Date.now();
  const sessions: number[][] = [];
  for (let d = 90; d >= 1; d--) {
    const start = now - d * 86_400_000 + (17 + rand() * 5) * 3_600_000;
    const n = 3 + Math.floor(rand() * 8);
    sessions.push(Array.from({ length: n }, (_, i) => start + i * 11 * 60_000));
  }
  const lastStart = now - 70 * 60_000;
  sessions.push(Array.from({ length: 7 }, (_, i) => lastStart + i * 9 * 60_000));

  let rank = 22; // Gold 8
  const allGames: string[] = [];
  sessions.forEach((times, si) => {
    const tilt = si === sessions.length - 1;
    for (const [gi, at] of times.entries()) {
      const days = (now - at) / 86_400_000;
      const deck = days > 30 ? pick([zooV1, zooV1, pally]) : pick([zooV2, zooV2, pally]);
      const arch = rand() < 0.75 ? pick(arches) : null;
      const opponentClass = arch?.cls ?? pick(classes);
      const wentFirst = rand() < 0.5;
      const turns = 6 + Math.floor(rand() * 9);

      // My cards: shuffled deck, mulligan, draws, plays.
      const library = shuffle(deck.list.flatMap(([id, n]) => Array.from({ length: n }, () => id)));
      const offered = library.splice(0, wentFirst ? 3 : 4);
      const events: { side: "FRIENDLY" | "OPPOSING"; dbfId: number; event: (typeof s.CARD_EVENTS)[number]; turn: number }[] = [];
      const hand: number[] = [];
      for (const id of offered) {
        const keep = (costOf.get(id) ?? 0) <= 2 || (deck.power.get(id) ?? 0) > 0.03 ? rand() < 0.85 : rand() < 0.25;
        events.push({ side: "FRIENDLY", dbfId: id, event: keep ? "MULLIGAN_KEPT" : "MULLIGAN_REPLACED", turn: 0 });
        if (keep) hand.push(id);
        else library.push(id);
      }
      while (hand.length < offered.length) hand.push(library.shift()!);
      const drawn: { id: number; turn: number }[] = hand.map((id) => ({ id, turn: 0 }));
      for (let turn = 1; turn <= turns; turn++) {
        const id = library.shift();
        if (id === undefined) break;
        events.push({ side: "FRIENDLY", dbfId: id, event: "DRAWN", turn });
        drawn.push({ id, turn });
      }
      for (const d of drawn) {
        const playTurn = Math.max(d.turn, costOf.get(d.id) ?? 0, 1) + Math.floor(rand() * 2);
        if (playTurn <= turns && rand() < 0.8) events.push({ side: "FRIENDLY", dbfId: d.id, event: "PLAYED", turn: playTurn });
      }

      // Opponent: a few signature cards of their archetype plus class cards.
      const oppCards = arch ? [...shuffle([...arch.signature]).slice(0, 1 + Math.floor(rand() * 4)), ...shuffle([...arch.filler]).slice(0, 4)] : shuffle(pool(opponentClass, true).map((c) => c.dbfId)).slice(0, 5);
      oppCards.forEach((id, i) => {
        const turn = Math.min(turns, 1 + i + Math.floor(rand() * 2));
        events.push({ side: "OPPOSING", dbfId: id, event: "REVEALED", turn }, { side: "OPPOSING", dbfId: id, event: "PLAYED", turn });
      });

      const handPower = drawn.reduce((sum, d) => sum + (deck.power.get(d.id) ?? 0), 0) / 3;
      let p = deck.base + (arch?.edge ?? 0) + (wentFirst ? 0.06 : -0.06) + handPower;
      if (tilt) p = gi < 3 ? 0.6 : 0.03;
      const result = rand() < 0.01 ? "TIE" : rand() < Math.min(0.9, Math.max(0.05, p)) ? "WIN" : "LOSS";
      const rankBefore = rank;
      rank = Math.max(0, Math.min(46, rank + (result === "WIN" ? 1 : result === "LOSS" ? -1 : 0)));
      const id = randomUUID();
      db.insert(s.games)
        .values({
          id,
          playedAt: new Date(at).toISOString(),
          mode: "RANKED",
          format: "STANDARD",
          result,
          playerClass: deck.cls,
          opponentClass,
          deckId: deck.deckId,
          deckVersionId: deck.versionId,
          wentFirst,
          turns,
          durationSec: turns * (40 + Math.floor(rand() * 30)),
          rankBefore,
          rankAfter: rank,
          source: "POWER_LOG",
          sourceHash: id,
        })
        .run();
      db.insert(s.gameCardEvents).values(events.map((e) => ({ ...e, gameId: id }))).run();
      allGames.push(id);
    }
  });
  const classified = reclassifyOpponents();
  console.log(`Added ${allGames.length} games in ${sessions.length} sessions, ${arches.length} archetypes (${classified} games classified) to ${DATA_DIR}.`);
}

void main();
