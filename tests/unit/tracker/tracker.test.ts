import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { indexCards } from "@/lib/cards/all-cards";
import { TrackerLog } from "@/lib/tracker/game";
import { buildTrackerView, type TrackerDeck, type TrackerView } from "@/lib/tracker/view";

const DIR = path.join(process.cwd(), "tests/fixtures/power-logs");
const LOG = path.join(DIR, "Hearthstone_2026_11_13_22_32_43", "Power.log");
const CARDS = JSON.parse(fs.readFileSync(path.join(DIR, "cards.json"), "utf8")) as Record<string, number>;
// The fixture card map has ids and dbfIds only; names and costs are made up for the test.
const cards = indexCards(Object.entries(CARDS).map(([id, dbfId], i) => ({ id, dbfId, name: `Card ${id}`, cost: i % 8 })));
const lines = fs.readFileSync(LOG, "utf8").split("\n");

/** Feeds lines and calls `check` with the view after every line that changed something. */
function replay(input: string[], deck: TrackerDeck | null, check?: (view: TrackerView, log: TrackerLog) => void) {
  const log = new TrackerLog();
  let view = buildTrackerView(null, deck, cards);
  for (const line of input) {
    if (log.feed(line)) {
      view = buildTrackerView(log.game, deck, cards);
      check?.(view, log);
    }
  }
  return { log, view };
}

const firstGameEnd = lines.findIndex((l) => l.includes("tag=STATE value=COMPLETE"));

describe("deck tracker on a recorded game", () => {
  it("follows the first game to its end", () => {
    const { view, log } = replay(lines.slice(0, firstGameEnd + 1), null);
    expect(view.status).toBe("over");
    expect(log.game?.friendlyPlayerId).toBe(1);
    expect(view.me.rows.length).toBeGreaterThan(5);
    expect(view.opponent.rows.length).toBeGreaterThan(3);
    expect(view.me.rows.some((r) => r.cardId === "GAME_005")).toBe(false);
  });

  it("counts a listed card down as it is drawn and dims nothing that was not drawn", () => {
    const { view: end } = replay(lines.slice(0, firstGameEnd + 1), null);
    const drawn = end.me.rows[0];
    if (!drawn) throw new Error("no cards seen");
    const dbf = CARDS[drawn.cardId];
    if (!dbf) throw new Error("unknown card");
    const unseen = Object.values(CARDS).find((d) => !end.me.rows.some((r) => CARDS[r.cardId] === d));
    if (!unseen) throw new Error("no unseen card");
    const deck: TrackerDeck = { name: "Test", source: "code", cards: [{ dbfId: dbf, count: 2 }, { dbfId: unseen, count: 1 }] };
    const { view } = replay(lines.slice(0, firstGameEnd + 1), deck);
    const row = view.me.rows.find((r) => r.cardId === drawn.cardId);
    expect(row?.left).toBe(Math.max(0, 2 - drawn.seen));
    const untouched = view.me.rows.find((r) => CARDS[r.cardId] === unseen);
    expect(untouched?.left).toBe(1);
    expect(untouched?.drawChance).toBeCloseTo(1 / view.me.deckCount);
  });

  it("starts a fresh game on the next CREATE_GAME", () => {
    const second = lines.findIndex((l, i) => i > firstGameEnd && l.includes("CREATE_GAME"));
    const { view } = replay(lines.slice(0, second + 40), null);
    expect(view.opponent.rows).toEqual([]);
    expect(view.opponent.unrevealed).toBe(0);
  });
});

describe("fair play", () => {
  it("says nothing about the opponent's hand but its size, at any moment of the session", () => {
    replay(lines, null, (view) => {
      expect(Object.keys(view.opponent).sort()).toEqual(["cls", "deckCount", "handCount", "rows", "unrevealed"]);
      expect(typeof view.opponent.handCount).toBe("number");
    });
  });

  it("lists an opponent's card only after its face has been seen, and never while it is in their hand unseen", () => {
    replay(lines, null, (view, log) => {
      for (const row of view.opponent.rows) {
        expect(row.count).toBe(row.keys.length);
        for (const key of row.keys) expect(log.game?.entities.get(key)?.wasPublic).toBe(true);
      }
    });
  });

  it("groups copies and sorts by mana cost like my deck", () => {
    const { view } = replay(lines.slice(0, firstGameEnd + 1), null);
    const costs = view.opponent.rows.map((r) => r.cost ?? 99);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    expect(new Set(view.opponent.rows.map((r) => r.cardId)).size).toBe(view.opponent.rows.length);
    expect(view.opponent.rows.reduce((n, r) => n + r.count, 0)).toBeGreaterThanOrEqual(view.opponent.rows.length);
  });

  it("keeps a secret hidden even if the log names it, until it is revealed", () => {
    const at = (t: string) => `D 23:00:${t}.0000000 GameState.DebugPrintPower() - `;
    const setup = lines.slice(0, lines.findIndex((l) => l.includes("value=MAIN_READY")) + 1);
    const leak = [
      `${at("00")}SHOW_ENTITY - Updating Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=40 zone=HAND zonePos=1 cardId= player=2] CardID=TIME_029`,
      `${at("00")}    tag=CONTROLLER value=2`,
      `${at("01")}BLOCK_START BlockType=PLAY Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=40 zone=HAND zonePos=1 cardId= player=2] EffectCardId= EffectIndex=0 Target=0 SubOption=-1`,
      `${at("01")}TAG_CHANGE Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=40 zone=HAND zonePos=1 cardId= player=2] tag=ZONE value=SECRET`,
    ];
    const { view: hidden } = replay([...setup, ...leak], null);
    expect(hidden.opponent.rows.some((r) => r.cardId === "TIME_029")).toBe(false);
    expect(hidden.opponent.unrevealed).toBe(1);
    const reveal = `${at("09")}TAG_CHANGE Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=40 zone=SECRET zonePos=1 cardId= player=2] tag=ZONE value=GRAVEYARD`;
    const { view: shown } = replay([...setup, ...leak, reveal], null);
    expect(shown.opponent.rows.find((r) => r.cardId === "TIME_029")).toMatchObject({ count: 1, keys: [40] });
    expect(shown.opponent.unrevealed).toBe(0);
  });

  it("counts cards in the opponent's hand without listing them, even when the log names one", () => {
    const setup = lines.slice(0, lines.findIndex((l) => l.includes("value=MAIN_READY")) + 1);
    const at = "D 23:00:00.0000000 GameState.DebugPrintPower() - ";
    const { view: before } = replay(setup, null);
    const extra = [
      `${at}FULL_ENTITY - Creating ID=900 CardID=TIME_029`,
      `${at}    tag=ZONE value=HAND`,
      `${at}    tag=CONTROLLER value=2`,
      `${at}FULL_ENTITY - Creating ID=901 CardID=`,
      `${at}    tag=ZONE value=HAND`,
      `${at}    tag=CONTROLLER value=2`,
    ];
    const { view } = replay([...setup, ...extra], null);
    expect(view.opponent.handCount).toBe(before.opponent.handCount + 2);
    expect(view.opponent.rows).toEqual(before.opponent.rows);
  });
});
