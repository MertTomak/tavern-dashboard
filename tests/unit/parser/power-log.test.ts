import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PowerLogParser } from "@/lib/parser/game-state";
import { parsePowerLogFile } from "@/lib/parser/read-file";
import { LogClock, sessionFromFolder } from "@/lib/parser/time";
import type { GameRecord } from "@/lib/parser/record";

const DIR = path.join(process.cwd(), "tests/fixtures/power-logs");
const SESSION = "Hearthstone_2026_11_13_22_32_43";
const LOG = path.join(DIR, SESSION, "Power.log");
const EXPECTED = path.join(DIR, SESSION, "expected.json");
const TZ = "Europe/Istanbul";
const CARDS = JSON.parse(fs.readFileSync(path.join(DIR, "cards.json"), "utf8")) as Record<string, number>;
const dbfOf = (id: string) => CARDS[id];

/** Runs lines through a fresh parser (for variations of the real log made in memory). */
function parseLines(lines: string[], session = SESSION) {
  const start = sessionFromFolder(session);
  if (!start) throw new Error("bad session");
  const parser = new PowerLogParser({ session, start, timeZone: TZ, dbfOf });
  const games: GameRecord[] = lines.flatMap((l) => parser.feed(l));
  return { games, skipped: parser.skipped, inGame: parser.inGame };
}

const realLines = () => fs.readFileSync(LOG, "utf8").split("\n");

describe("Power.log parser on a real session (3 ranked games, anonymised)", () => {
  it("matches the stored expected output", async () => {
    const result = await parsePowerLogFile(LOG, { timeZone: TZ, dbfOf });
    // UPDATE_FIXTURES=1 npm run test rewrites the expected file after a deliberate parser change.
    if (process.env.UPDATE_FIXTURES) fs.writeFileSync(EXPECTED, JSON.stringify(result, null, 2) + "\n");
    expect(result).toEqual(JSON.parse(fs.readFileSync(EXPECTED, "utf8")));
  });

  it("reads what actually happened: a conceded loss, then two wins", async () => {
    const { games, skipped } = await parsePowerLogFile(LOG, { timeZone: TZ, dbfOf });
    expect(skipped).toEqual([]);
    expect(games.map((g) => [g.mode, g.format, g.playerClass, g.opponentClass, g.result, g.conceded, g.wentFirst, g.turns])).toEqual([
      ["RANKED", "STANDARD", "WARLOCK", "WARLOCK", "LOSS", "FRIENDLY", false, 7],
      ["RANKED", "STANDARD", "WARLOCK", "DRUID", "WIN", "OPPOSING", true, 5],
      ["RANKED", "STANDARD", "WARLOCK", "WARLOCK", "WIN", "OPPOSING", false, 4],
    ]);
  });

  it("dates games from the session folder and converts Istanbul time to UTC", async () => {
    const { games } = await parsePowerLogFile(LOG, { timeZone: TZ, dbfOf });
    expect(games[0]?.startedAt).toBe("2026-11-13T19:33:33.961Z");
    expect(games[0]?.durationSec).toBe(277);
  });

  it("keeps no BattleTags and gives every game its own duplicate key", async () => {
    const { games } = await parsePowerLogFile(LOG, { timeZone: TZ, dbfOf });
    expect(JSON.stringify(games)).not.toMatch(/#\d{4}/);
    expect(new Set(games.map((g) => g.sourceHash)).size).toBe(3);
  });

  it("reads the mulligan: offered cards are kept or replaced, The Coin is not counted", async () => {
    const { games } = await parsePowerLogFile(LOG, { timeZone: TZ, dbfOf });
    const mulligan = (g: GameRecord | undefined) => g?.cardEvents.filter((e) => e.turn === 0).map((e) => e.event);
    expect(mulligan(games[0])).toEqual(["MULLIGAN_KEPT", "MULLIGAN_KEPT", "MULLIGAN_KEPT", "MULLIGAN_KEPT"]);
    expect(mulligan(games[1])?.sort()).toEqual(["MULLIGAN_KEPT", "MULLIGAN_REPLACED", "MULLIGAN_REPLACED"]);
  });

  it("only counts our draws, and only the opponent's reveals", async () => {
    const { games } = await parsePowerLogFile(LOG, { timeZone: TZ, dbfOf });
    for (const g of games) {
      expect(g.cardEvents.filter((e) => e.event === "DRAWN").every((e) => e.side === "FRIENDLY")).toBe(true);
      expect(g.cardEvents.filter((e) => e.event === "REVEALED").every((e) => e.side === "OPPOSING")).toBe(true);
    }
  });
});

describe("Power.log parser edge cases", () => {
  it("drops a game cut off mid-way and reports it as still in progress", () => {
    const lines = realLines();
    const lastComplete = lines.findLastIndex((l) => l.includes("GameState.DebugPrintPower() - TAG_CHANGE Entity=GameEntity tag=STATE value=COMPLETE"));
    const { games, inGame } = parseLines(lines.slice(0, lastComplete - 50));
    expect(games).toHaveLength(2);
    expect(inGame).toBe(true);
  });

  it("ignores PowerTaskList lines (the client prints every event twice)", () => {
    const lines = realLines();
    const doubled = lines.flatMap((l) => (l.includes("GameState.DebugPrintPower()") ? [l, l.replace("GameState.DebugPrintPower()", "PowerTaskList.DebugPrintPower()")] : [l]));
    expect(parseLines(doubled).games).toEqual(parseLines(lines).games);
  });

  it("maps unknown game types to OTHER and Arena to ARENA without failing", () => {
    const unknown = parseLines(realLines().map((l) => l.replace("GameType=GT_RANKED", "GameType=GT_SOMETHING_NEW")));
    expect(unknown.games.map((g) => g.mode)).toEqual(["OTHER", "OTHER", "OTHER"]);
    const arena = parseLines(realLines().map((l) => l.replace("GameType=GT_RANKED", "GameType=GT_ARENA")));
    expect(arena.games.map((g) => g.mode)).toEqual(["ARENA", "ARENA", "ARENA"]);
  });

  it("reads a tie", () => {
    const lines = realLines().map((l) => l.replace(/tag=PLAYSTATE value=(WON|LOST)/, "tag=PLAYSTATE value=TIED"));
    expect(parseLines(lines).games.map((g) => g.result)).toEqual(["TIE", "TIE", "TIE"]);
  });

  it("rolls the date over at midnight", () => {
    const clock = new LogClock({ y: 2026, m: 11, d: 13, clock: (23 * 60 + 50) * 60_000 }, TZ);
    expect(new Date(clock.at((23 * 60 + 59) * 60_000)).toISOString()).toBe("2026-11-13T20:59:00.000Z");
    expect(new Date(clock.at(60_000)).toISOString()).toBe("2026-11-13T21:01:00.000Z");
  });

  it("tolerates a Battlegrounds game (reads the placement, no matchup)", () => {
    const at = (t: string, body: string) => `D ${t}.0000000 GameState.DebugPrintPower() - ${body}`;
    const game = (t: string, body: string) => `D ${t}.0000000 GameState.DebugPrintGame() - ${body}`;
    const lines = [
      at("21:00:00", "CREATE_GAME"),
      at("21:00:00", "    GameEntity EntityID=1"),
      at("21:00:00", "    Player EntityID=2 PlayerID=1 GameAccountId=[hi=0 lo=1]"),
      at("21:00:00", "    Player EntityID=3 PlayerID=2 GameAccountId=[hi=0 lo=0]"),
      at("21:00:00", "FULL_ENTITY - Creating ID=40 CardID=TB_BaconShop_HERO_01"),
      at("21:00:00", "    tag=CONTROLLER value=1"),
      at("21:00:00", "    tag=CARDTYPE value=HERO"),
      at("21:00:00", "    tag=ZONE value=PLAY"),
      game("21:00:00", "GameType=GT_BATTLEGROUNDS"),
      game("21:00:00", "FormatType=FT_WILD"),
      game("21:00:00", "PlayerID=1, PlayerName=Player#0001"),
      game("21:00:00", "PlayerID=2, PlayerName=The Innkeeper"),
      at("21:20:00", "TAG_CHANGE Entity=40 tag=PLAYER_LEADERBOARD_PLACE value=3"),
      at("21:20:00", "TAG_CHANGE Entity=Player#0001 tag=PLAYSTATE value=WON"),
      at("21:20:00", "TAG_CHANGE Entity=GameEntity tag=STATE value=COMPLETE"),
    ];
    const { games } = parseLines(lines);
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({ mode: "BATTLEGROUNDS", placement: 3, wentFirst: null, cardEvents: [] });
  });
});

describe("dating an uploaded log without its folder name", () => {
  it("walks back from the file's last write over the midnights the log crossed", async () => {
    const { scanClock, sessionFromLastWrite } = await import("@/lib/parser/time");
    const h = (n: number) => n * 3_600_000;
    // 23:10 → 23:59 → 00:30: one midnight; the file was last written at 00:31 on the 14th (Istanbul).
    const scan = [h(23) + 600_000, h(23) + 3_540_000, h(0) + 1_800_000].reduce(scanClock, null as ReturnType<typeof scanClock> | null);
    expect(scan?.rollovers).toBe(1);
    const start = sessionFromLastWrite(new Date("2026-11-13T21:31:00Z"), scan!, TZ);
    expect(start).toEqual({ y: 2026, m: 11, d: 13, clock: h(23) + 600_000 });
  });

  it("dates the real fixture the same way as its folder name does", async () => {
    const { scanLogClock, parsePowerLogStream } = await import("@/lib/parser/read-file");
    const { sessionFromLastWrite } = await import("@/lib/parser/time");
    const scan = await scanLogClock(fs.createReadStream(LOG));
    const start = sessionFromLastWrite(new Date("2026-11-13T19:45:57Z"), scan!, TZ);
    const viaUpload = await parsePowerLogStream(fs.createReadStream(LOG), { session: "upload", start, timeZone: TZ, dbfOf });
    const viaFolder = await parsePowerLogFile(LOG, { timeZone: TZ, dbfOf });
    expect(viaUpload.games.map((g) => g.sourceHash)).toEqual(viaFolder.games.map((g) => g.sourceHash));
  });
});
