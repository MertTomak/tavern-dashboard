import { encode } from "deckstrings";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { Card } from "@/lib/cards/classes";
import { deriveClasses } from "@/lib/cards/classes";
import * as s from "@/lib/db/schema";
import { classifyArchetype, type ArchetypeRule } from "@/lib/stats/archetypes";
import { fixtureGames } from "./fixture";
import { RECORDED_DECK } from "./recorded-deck";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** Istanbul is UTC+3 all year. */
const ISTANBUL_OFFSET = 3 * HOUR;

type Db = BetterSQLite3Database<typeof s>;
type CardEvent = { side: (typeof s.CARD_SIDES)[number]; dbfId: number; event: (typeof s.CARD_EVENTS)[number]; turn: number };

export type DemoSummary = { games: number; recorded: number; decks: number; archetypes: number };

/**
 * The demo's anchor: the start of the current hour. Every server process that
 * builds the dataset within the same hour gets identical rows, and games stay
 * recent however long ago the demo was deployed.
 */
export const demoAnchor = (now = Date.now()) => Math.floor(now / HOUR) * HOUR;

/** Small deterministic PRNG (mulberry32), so the dataset and its ids are the same every time. */
function prng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fills an empty, migrated database with the demo: three decks (the Warlock
 * deck in two versions, its newest the one from the recorded games), opponent
 * archetypes, about 90 days of ranked sessions with mulligans, draws and plays,
 * a climb from Gold, one session that ends on tilt, and the three games of the
 * recorded fixture log. Pure function of the card data and `anchor`.
 */
export function fillDemoDatabase(db: Db, cards: readonly Card[], anchor = demoAnchor()): DemoSummary {
  const rand = prng(20261117);
  const pick = <T>(a: readonly T[]): T => a[Math.floor(rand() * a.length)];
  const shuffle = <T>(a: T[]): T[] => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const uuid = () => {
    const hex = Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16));
    hex[12] = "4";
    hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    const h = hex.join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };

  const classes = deriveClasses([...cards]);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const nameOf = new Map(cards.map((c) => [c.dbfId, c.name]));
  const costOf = new Map(cards.map((c) => [c.dbfId, c.cost ?? 0]));
  const cardKey = (dbfId: number) => nameOf.get(dbfId) ?? dbfId;
  const pool = (cls: string, classOnly = false) =>
    cards.filter((c) => c.type !== "HERO" && c.type !== "LOCATION" && (c.cardClass === cls || (!classOnly && c.cardClass === "NEUTRAL")) && (c.cost ?? 0) <= 8);
  const hero = (cls: string) => (cards.find((c) => c.type === "HERO" && c.cardClass === cls && /^HERO_\d+$/.test(c.id)) ?? cards.find((c) => c.type === "HERO" && c.cardClass === cls))?.dbfId ?? 0;
  const total = (list: Map<number, number>) => [...list.values()].reduce((a, b) => a + b, 0);

  /** Fills a list to 30 cards from the class's pool (two copies, one of a legendary). */
  function fill(cls: string, start: Map<number, number>): [number, number][] {
    const list = new Map(start);
    for (const c of shuffle(pool(cls).filter((c) => (c.cost ?? 0) <= 6))) {
      if (total(list) >= 30) break;
      if (list.has(c.dbfId)) continue;
      list.set(c.dbfId, c.rarity === "LEGENDARY" ? 1 : Math.min(2, 30 - total(list)));
    }
    return [...list.entries()].sort((a, b) => a[0] - b[0]);
  }

  return db.transaction((tx) => {
    type MyDeck = { deckId: number; versionId: number; cls: string; list: [number, number][]; base: number; power: Map<number, number> };
    function saveDeck(name: string, cls: string, versions: [number, number][][], base: number[]): MyDeck[] {
      const deckId = tx.insert(s.decks).values({ name, playerClass: cls, format: "STANDARD", createdAt: new Date(anchor - 75 * DAY).toISOString() }).returning({ id: s.decks.id }).get().id;
      return versions.map((list, i) => {
        const createdAt = new Date(anchor - (versions.length - 1 - i ? 75 : 30) * DAY).toISOString();
        const deckstring = encode({ cards: list, heroes: [hero(cls)], format: 2 });
        const versionId = tx.insert(s.deckVersions).values({ deckId, versionNo: i + 1, deckstring, createdAt }).returning({ id: s.deckVersions.id }).get().id;
        tx.insert(s.deckCards).values(list.map(([dbfId, count]) => ({ deckVersionId: versionId, dbfId, count }))).run();
        // Each card nudges the win chance when it is drawn: a few are clearly good, a few clearly bad.
        const power = new Map(list.map(([id]) => [id, (rand() - 0.5) * 0.12]));
        return { deckId, versionId, cls, list, base: base[i], power };
      });
    }

    // The Warlock deck: version 2 is the recorded deck, version 1 had three other pairs.
    const recorded = new Map(RECORDED_DECK.cards.flatMap(([id, n]) => (byId.has(id) ? [[byId.get(id)!.dbfId, n] as const] : [])));
    const warlockV2 = fill("WARLOCK", recorded);
    const pairsOut = new Set(warlockV2.filter(([, n]) => n === 2).slice(0, 3).map(([id]) => id));
    const swapIn = pool("WARLOCK", true).filter((c) => !recorded.has(c.dbfId) && c.rarity !== "LEGENDARY" && (c.cost ?? 0) <= 5).slice(0, 3);
    const warlockV1 = [...warlockV2.filter(([id]) => !pairsOut.has(id)), ...swapIn.map((c): [number, number] => [c.dbfId, 2])].sort((a, b) => a[0] - b[0]);
    const [ritualV1, ritualV2] = saveDeck(RECORDED_DECK.name, "WARLOCK", [warlockV1, warlockV2], [0.5, 0.63]);
    const [pally] = saveDeck("Aggro Paladin", "PALADIN", [fill("PALADIN", new Map())], [0.57]);
    const [druid] = saveDeck("Dragon Druid", "DRUID", [fill("DRUID", new Map())], [0.53]);

    // Opponent archetypes: two per common class, six signature cards each.
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
    const rules: ArchetypeRule[] = [];
    for (const cls of classes.filter((c) => c in archetypeNames)) {
      const classCards = shuffle(pool(cls, true).map((c) => c.dbfId));
      archetypeNames[cls].forEach((name, i) => {
        const signature = classCards.slice(i * 6, i * 6 + 6);
        const id = tx.insert(s.archetypes).values({ name, playerClass: cls, signatureCards: signature, minMatches: 2 }).returning({ id: s.archetypes.id }).get().id;
        rules.push({ id, name, playerClass: cls, signatureCards: signature, minMatches: 2 });
        // Win-chance shift against this archetype: Enrage Warrior and Aggro Hunter are hard, Control Priest easy.
        const edge = name === "Enrage Warrior" ? -0.3 : name === "Aggro Hunter" ? -0.12 : name === "Control Priest" ? 0.3 : (rand() - 0.5) * 0.08;
        arches.push({ cls, signature, filler: classCards.slice(12, 40), edge });
      });
    }
    const archetypeOf = (opponentClass: string, events: readonly CardEvent[]) =>
      classifyArchetype(opponentClass, events.filter((e) => e.side === "OPPOSING" && (e.event === "PLAYED" || e.event === "REVEALED")).map((e) => cardKey(e.dbfId)), rules, cardKey)?.id ?? null;

    // Sessions: most evenings of the last 90 days (some afternoons), and a session
    // that started 70 minutes ago and ends with four losses (tilt).
    const today = anchor - ((anchor + ISTANBUL_OFFSET) % DAY);
    const tiltStart = anchor - 70 * MINUTE;
    const sessions: number[][] = [];
    for (let d = 90; d >= 1; d--) {
      if (rand() < 0.2) continue; // a day off
      const hour = rand() < 0.3 ? 13 + rand() * 3 : 18 + rand() * 4;
      const start = today - d * DAY + hour * HOUR;
      const n = 3 + Math.floor(rand() * 8);
      const times = Array.from({ length: n }, (_, i) => start + i * (9 + Math.floor(rand() * 5)) * MINUTE).filter((t) => t < tiltStart - 30 * MINUTE);
      if (times.length) sessions.push(times);
    }
    sessions.push(Array.from({ length: 7 }, (_, i) => tiltStart + i * 9 * MINUTE));

    let rank = 22; // Gold 8
    let count = 0;
    sessions.forEach((times, si) => {
      const tilt = si === sessions.length - 1;
      for (const [gi, at] of times.entries()) {
        const daysAgo = (anchor - at) / DAY;
        const deck = daysAgo > 30 ? pick([ritualV1, ritualV1, pally, druid]) : pick([ritualV2, ritualV2, ritualV2, pally, druid]);
        const arch = rand() < 0.75 ? pick(arches) : null;
        const opponentClass = arch?.cls ?? pick(classes);
        const wentFirst = rand() < 0.5;
        const turns = 6 + Math.floor(rand() * 9);

        // My cards: shuffled deck, mulligan, draws, plays.
        const library = shuffle(deck.list.flatMap(([id, n]) => Array.from({ length: n }, () => id)));
        const offered = library.splice(0, wentFirst ? 3 : 4);
        const events: CardEvent[] = [];
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
        let p = deck.base + (arch?.edge ?? 0) + (wentFirst ? 0.05 : -0.05) + handPower;
        if (tilt) p = gi < 3 ? 0.6 : 0.03;
        const roll = rand();
        const result = rand() < 0.01 ? "TIE" : roll < Math.min(0.9, Math.max(0.05, p)) ? "WIN" : "LOSS";
        const rankBefore = rank;
        rank = Math.max(0, Math.min(46, rank + (result === "WIN" ? 1 : result === "LOSS" ? -1 : 0)));
        const id = uuid();
        tx.insert(s.games)
          .values({
            id,
            playedAt: new Date(at).toISOString(),
            mode: "RANKED",
            format: "STANDARD",
            result,
            playerClass: deck.cls,
            opponentClass,
            opponentArchetypeId: archetypeOf(opponentClass, events),
            deckId: deck.deckId,
            deckVersionId: deck.versionId,
            wentFirst,
            turns,
            durationSec: turns * (40 + Math.floor(rand() * 30)),
            rankBefore,
            rankAfter: rank,
            source: "POWER_LOG",
            sourceHash: `demo:${id}`,
            createdAt: new Date(at).toISOString(),
            updatedAt: new Date(at).toISOString(),
          })
          .run();
        tx.insert(s.gameCardEvents).values(events.map((e) => ({ ...e, gameId: id }))).run();
        count++;
      }
    });

    // The recorded games, moved to two days ago (same time of day), on the recorded deck.
    const dbfOf = (cardId: string) => byId.get(cardId)?.dbfId;
    const records = fixtureGames(dbfOf);
    const first = records[0] ? Date.parse(records[0].startedAt) : anchor;
    const shift = Math.round((today - 2 * DAY - first) / DAY) * DAY;
    for (const r of records) {
      const id = uuid();
      const at = (iso: string) => new Date(Date.parse(iso) + shift).toISOString();
      tx.insert(s.games)
        .values({
          id,
          playedAt: at(r.startedAt),
          mode: r.mode,
          format: r.format,
          result: r.result,
          playerClass: r.playerClass,
          opponentClass: r.opponentClass,
          opponentArchetypeId: archetypeOf(r.opponentClass, r.cardEvents),
          deckId: r.playerClass === "WARLOCK" ? ritualV2.deckId : null,
          deckVersionId: r.playerClass === "WARLOCK" ? ritualV2.versionId : null,
          wentFirst: r.wentFirst,
          turns: r.turns,
          durationSec: r.durationSec,
          source: "POWER_LOG",
          sourceHash: r.sourceHash,
          createdAt: at(r.startedAt),
          updatedAt: at(r.startedAt),
        })
        .run();
      if (r.cardEvents.length) tx.insert(s.gameCardEvents).values(r.cardEvents.map((e) => ({ gameId: id, side: e.side, dbfId: e.dbfId, event: e.event, turn: e.turn }))).run();
    }

    return { games: count + records.length, recorded: records.length, decks: 3, archetypes: rules.length };
  });
}
