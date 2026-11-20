import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LogWatcher } from "@/lib/watcher/log-watcher";
import { TrackerSession } from "../../../electron/tracker";

/**
 * B6: the tracker updates within a second of a line appearing in Power.log.
 * The recorded game is written in timed batches into a fake log folder; the
 * real watcher and tracker session read it, and every batch must show up in a
 * new view in under a second. A stub server stands in for the dashboard.
 */
const LOG = path.join(process.cwd(), "tests/fixtures/power-logs/Hearthstone_2026_11_13_22_32_43/Power.log");
// The product promise is one second. Shared CI runners are slower and noisier, so they get more room.
const LIMIT_MS = process.env.CI ? 3000 : 1000;

let server: http.Server;
let url = "";
let root = "";

beforeAll(async () => {
  server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(req.url?.startsWith("/api/watcher/state") ? '{"byteOffset":0}' : req.url?.startsWith("/api/tracker/deck") ? '{"deck":null}' : '{"imported":0,"skipped":0}');
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  url = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
  root = fs.mkdtempSync(path.join(os.tmpdir(), "tavern-speed-"));
});
afterAll(() => {
  server.close();
  fs.rmSync(root, { recursive: true, force: true });
});

describe("tracker speed", () => {
  it("shows each new batch of log lines within a second", async () => {
    const folder = path.join(root, "Hearthstone_2026_11_13_22_32_43");
    fs.mkdirSync(folder);
    const file = path.join(folder, "Power.log");
    fs.writeFileSync(file, "");

    const views: number[] = [];
    const tracker = new TrackerSession(url, () => views.push(Date.now()));
    const watcher = new LogWatcher({
      owner: "test",
      logRoot: root,
      appUrl: url,
      hooks: { say: () => undefined, onPowerLine: (line, live) => tracker.line(line, live), onLive: () => tracker.catchUp() },
    });
    await watcher.start();

    const lines = fs.readFileSync(LOG, "utf8").split("\n").slice(0, 4000);
    const batches = 20;
    const size = Math.ceil(lines.length / batches);
    const delays: number[] = [];
    for (let b = 0; b < batches; b++) {
      const written = Date.now();
      fs.appendFileSync(file, `${lines.slice(b * size, (b + 1) * size).join("\n")}\n`);
      // Wait for a view newer than this write.
      while (!views.some((t) => t >= written) && Date.now() - written < 3000) await new Promise((r) => setTimeout(r, 10));
      const shown = views.find((t) => t >= written);
      delays.push(shown ? shown - written : Infinity);
      await new Promise((r) => setTimeout(r, 150));
    }
    await watcher.stop();
    console.log(`tracker delay per batch (ms): median ${[...delays].sort((a, b) => a - b)[Math.floor(delays.length / 2)]}, max ${Math.max(...delays)}`);
    expect(Math.max(...delays)).toBeLessThan(LIMIT_MS);
  }, 30_000);
});
