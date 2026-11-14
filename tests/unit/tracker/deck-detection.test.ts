import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { encode } from "deckstrings";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LogWatcher } from "@/lib/watcher/log-watcher";
import { TrackerSession } from "../../../electron/tracker";

/**
 * The deck of a game comes from Decks.log, which Hearthstone writes before the
 * game's first Power.log line. Found in a live game (2026-11-14): Power.log
 * only appears when the first game starts, several reads were triggered at
 * once, and one of them read Power.log while another was still on Decks.log.
 * The tracker then started the game without its deck ("Cards seen so far").
 */
const LOG = path.join(process.cwd(), "tests/fixtures/power-logs/Hearthstone_2026_11_13_22_32_43/Power.log");
const CODE = encode({ cards: [[1, 2], [2, 2], [3, 1]], heroes: [7], format: 2 });
const DECKS_LOG = ["I 22:32:50.0000000 Finding Game With Deck:", "I 22:32:50.0000000 ### Test Deck", "I 22:32:50.0000000 # Deck ID: 1", `I 22:32:50.0000000 ${CODE}`, ""].join("\n");

let server: http.Server;
let url = "";
let root = "";

beforeAll(async () => {
  server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    // A slow answer keeps the first read busy while more reads are asked for.
    setTimeout(() => res.end(req.url?.startsWith("/api/watcher/state") ? '{"byteOffset":0}' : '{"imported":0,"skipped":0,"deck":null}'), 30);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  url = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
  root = fs.mkdtempSync(path.join(os.tmpdir(), "tavern-decks-"));
});
afterAll(() => {
  server.close();
  fs.rmSync(root, { recursive: true, force: true });
});

const gameStart = () => fs.readFileSync(LOG, "utf8").split("\n").slice(0, 600).join("\n") + "\n";

describe("deck detection", () => {
  it("reads the queued deck before the game's first lines, even when several reads are asked for at once", async () => {
    const folder = path.join(root, "Hearthstone_2026_11_13_22_32_43");
    fs.mkdirSync(folder);
    fs.writeFileSync(path.join(folder, "Decks.log"), DECKS_LOG);
    fs.writeFileSync(path.join(folder, "Power.log"), gameStart());

    const order: string[] = [];
    const watcher = new LogWatcher({
      owner: "test",
      logRoot: root,
      appUrl: url,
      hooks: {
        say: () => undefined,
        onDeckQueued: () => order.push("deck"),
        onPowerLine: () => order.length < 2 && order.push("power"),
      },
    });
    const tick = () => (watcher as unknown as { tick: () => Promise<void> }).tick();
    // What chokidar does when Power.log appears and grows: several ticks on top of each other.
    await Promise.all([watcher.start(), tick(), tick(), tick(), new Promise((r) => setTimeout(r, 40)).then(tick)]);
    await watcher.stop();
    expect(order).toEqual(["deck", "power"]);
  });

  it("uses a deck that arrives after the game has started", () => {
    const views: string[] = [];
    const tracker = new TrackerSession(url, (v) => views.push(v.deck.source));
    for (const line of gameStart().split("\n")) tracker.line(line, false);
    expect(tracker.view.status).toBe("playing");
    expect(tracker.view.deck.source).toBe("seen");
    tracker.deckQueued({ at: 0, name: "Test Deck", code: CODE });
    expect(tracker.view.deck).toEqual({ name: "Test Deck", source: "code" });
  });
});
