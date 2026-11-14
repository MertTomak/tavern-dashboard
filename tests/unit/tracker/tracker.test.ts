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
    expect(view.opponent.played.length).toBeGreaterThan(3);
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
    expect(view.opponent.played).toEqual([]);
  });
});

describe("fair play", () => {
  it("never puts an identity on an opponent's hand card, at any moment of the session", () => {
    replay(lines, null, (view) => {
      for (const card of view.opponent.hand) expect(Object.keys(card).sort()).toEqual(["coin", "created", "slot", "turn"]);
    });
  });

  it("shows an opponent's card only after it has been seen on the board", () => {
    replay(lines, null, (view, log) => {
      for (const p of view.opponent.played) {
        if (!p.cardId) continue;
        expect(log.game?.entities.get(p.key)?.wasPublic).toBe(true);
      }
    });
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
    expect(hidden.opponent.played.at(-1)).toMatchObject({ cardId: null, name: null });
    const reveal = `${at("09")}TAG_CHANGE Entity=[entityName=UNKNOWN ENTITY [cardType=INVALID] id=40 zone=SECRET zonePos=1 cardId= player=2] tag=ZONE value=GRAVEYARD`;
    const { view: shown } = replay([...setup, ...leak, reveal], null);
    expect(shown.opponent.played.at(-1)?.cardId).toBe("TIME_029");
  });

  it("marks The Coin and created cards in the opponent's hand", () => {
    const setup = lines.slice(0, lines.findIndex((l) => l.includes("value=MAIN_READY")) + 1);
    const at = "D 23:00:00.0000000 GameState.DebugPrintPower() - ";
    const extra = [
      `${at}FULL_ENTITY - Creating ID=900 CardID=GAME_005`,
      `${at}    tag=ZONE value=HAND`,
      `${at}    tag=CONTROLLER value=2`,
      `${at}    tag=COIN_CARD value=1`,
      `${at}    tag=ZONE_POSITION value=9`,
      `${at}FULL_ENTITY - Creating ID=901 CardID=`,
      `${at}    tag=ZONE value=HAND`,
      `${at}    tag=CONTROLLER value=2`,
      `${at}    tag=ZONE_POSITION value=10`,
    ];
    const { view } = replay([...setup, ...extra], null);
    const [coin, created] = view.opponent.hand.slice(-2);
    expect(coin).toMatchObject({ coin: true, created: false });
    expect(created).toMatchObject({ coin: false, created: true });
    expect(view.opponent.hand.slice(0, -2).every((c) => !c.created && c.turn === 0)).toBe(true);
  });
});
