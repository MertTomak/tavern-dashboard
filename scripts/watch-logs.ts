/**
 * Live log watcher (npm run watch:logs, or with the app via npm run dev:all).
 *
 * Follows the newest Hearthstone session's Power.log as it grows, parses it
 * line by line and sends each finished game to the app (POST /api/import/watcher).
 * It never writes the database itself and only ever reads the Hearthstone folder.
 * How far it has read is stored by the server, so a restart carries on where it
 * stopped; anything sent twice is skipped by the duplicate check.
 */
import fs from "node:fs";
import path from "node:path";
import { watch } from "chokidar";
import { TIME_ZONE } from "@/i18n";
import { PowerLogParser } from "@/lib/parser/game-state";
import { cardDbfLookup, sessionOf } from "@/lib/parser/read-file";
import type { GameRecord } from "@/lib/parser/record";

const LOG_ROOT = process.env.HS_LOG_DIR ?? "/Applications/Hearthstone/Logs";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
/** Safety net next to file events: Hearthstone writes in bursts and some writes don't fire an event. */
const POLL_MS = 1500;
const MAX_BACKOFF_S = 30;

const say = (msg: string) => console.log(msg);
const dbfOf = cardDbfLookup();

// ---- talking to the app, with a retry queue ----

type Job = { path: string; body: unknown; describe?: (res: unknown) => string };
const queue: Job[] = [];
let sending = false;

async function post(urlPath: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${APP_URL}${urlPath}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function enqueue(job: Job) {
  queue.push(job);
  void drain();
}

async function drain() {
  if (sending) return;
  sending = true;
  let backoff = 1;
  while (queue.length) {
    const job = queue[0];
    if (!job) break;
    try {
      const res = await post(job.path, job.body);
      if (job.describe) say(job.describe(res));
      queue.shift();
      backoff = 1;
    } catch (err) {
      const reason = err instanceof Error && err.message.startsWith("HTTP 4") ? `rejected (${err.message})` : "Server unreachable";
      if (reason.startsWith("rejected")) {
        // A request the server refuses won't succeed later either: report it and move on.
        say(`✗ Game could not be saved: ${reason}`);
        queue.shift();
        continue;
      }
      say(`✗ ${reason}, retrying in ${backoff}s`);
      await new Promise((r) => setTimeout(r, backoff * 1000));
      backoff = Math.min(MAX_BACKOFF_S, backoff * 2);
    }
  }
  sending = false;
}

async function savedOffset(file: string): Promise<number> {
  for (let wait = 1; ; wait = Math.min(MAX_BACKOFF_S, wait * 2)) {
    try {
      const res = await fetch(`${APP_URL}/api/watcher/state?file=${encodeURIComponent(file)}`);
      if (res.ok) return ((await res.json()) as { byteOffset: number }).byteOffset;
    } catch {
      // Server not up yet (dev:all starts both at once).
    }
    say(`✗ Server unreachable, retrying in ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}

const label = (cls: string) => cls.charAt(0) + cls.slice(1).toLowerCase().replace(/_(\w)/g, (_, c: string) => ` ${c.toUpperCase()}`);
const RESULT = { WIN: "Win", LOSS: "Loss", TIE: "Tie" } as const;
const describeGame = (g: GameRecord) => `${label(g.playerClass)} vs ${label(g.opponentClass)} — ${RESULT[g.result]}`;

// ---- following one log file ----

class Follower {
  private parser: PowerLogParser;
  private readPos: number;
  private leftover = Buffer.alloc(0);
  private reading = false;
  /** Live "in game" updates only once we have caught up with what was already written. */
  private caughtUp = false;
  private inGame = false;

  constructor(
    readonly file: string,
    start: number,
  ) {
    this.readPos = start;
    this.parser = this.freshParser();
  }

  private freshParser() {
    const { session, start } = sessionOf(this.file, TIME_ZONE);
    return new PowerLogParser({ session, start, timeZone: TIME_ZONE, dbfOf });
  }

  async read() {
    if (this.reading) return;
    this.reading = true;
    try {
      const size = fs.statSync(this.file).size;
      if (size < this.readPos) {
        // The file was replaced or cut: start it over.
        this.readPos = 0;
        this.leftover = Buffer.alloc(0);
        this.parser = this.freshParser();
      }
      if (size > this.readPos) await this.consume(size);
      if (!this.caughtUp) {
        this.caughtUp = true;
        this.reportLive();
      }
    } catch (err) {
      say(`✗ Could not read ${this.file}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.reading = false;
    }
  }

  private async consume(size: number) {
    const fd = await fs.promises.open(this.file, "r");
    try {
      const chunk = Buffer.alloc(size - this.readPos);
      await fd.read(chunk, 0, chunk.length, this.readPos);
      const buf = Buffer.concat([this.leftover, chunk]);
      const base = this.readPos - this.leftover.length;
      let lineStart = 0;
      for (let nl = buf.indexOf(10); nl !== -1; nl = buf.indexOf(10, lineStart)) {
        const line = buf.subarray(lineStart, nl).toString("utf8");
        lineStart = nl + 1;
        const games = this.parser.feed(line.endsWith("\r") ? line.slice(0, -1) : line);
        if (games.length) this.send(games, base + lineStart);
        if (this.caughtUp) this.reportLive();
      }
      this.leftover = Buffer.from(buf.subarray(lineStart));
      this.readPos = size;
    } finally {
      await fd.close();
    }
  }

  private send(games: GameRecord[], byteOffset: number) {
    enqueue({
      path: "/api/import/watcher",
      body: { filePath: this.file, byteOffset, records: games },
      describe: (res) => {
        const { imported } = res as { imported: number };
        return games.map((g) => (imported ? `✓ New game saved: ${describeGame(g)}` : `· Already saved: ${describeGame(g)}`)).join("\n");
      },
    });
    if (this.inGame && !this.parser.inGame) this.inGame = false;
  }

  /** Tells the app when a game starts or ends (Full effects run as Light meanwhile). */
  private reportLive() {
    const now = this.parser.inGame;
    if (now === this.inGame) return;
    this.inGame = now;
    if (now) say("▶ Game started");
    enqueue({ path: "/api/watcher/live", body: { inGame: now } });
  }

  stop() {
    if (this.inGame) enqueue({ path: "/api/watcher/live", body: { inGame: false } });
  }
}

// ---- picking the newest session ----

/** The Power.log to follow: newest session folder (Hearthstone_YYYY_…), or an old single Logs/Power.log. */
function newestLog(): string | null {
  if (!fs.existsSync(LOG_ROOT)) return null;
  const sessions = fs
    .readdirSync(LOG_ROOT)
    .filter((n) => n.startsWith("Hearthstone_"))
    .sort()
    .reverse();
  for (const s of sessions) {
    const file = path.join(LOG_ROOT, s, "Power.log");
    if (fs.existsSync(file)) return file;
  }
  const legacy = path.join(LOG_ROOT, "Power.log");
  return fs.existsSync(legacy) ? legacy : null;
}

let follower: Follower | null = null;
let switching = false;

async function follow(file: string) {
  if (follower?.file === file || switching) return;
  switching = true;
  try {
    follower?.stop();
    const start = await savedOffset(file);
    say(`… Reading ${path.relative(LOG_ROOT, file)}${start ? ` from byte ${start}` : ""}`);
    follower = new Follower(file, start);
    await follower.read();
  } finally {
    switching = false;
  }
}

async function tick() {
  const file = newestLog();
  if (file && file !== follower?.file) await follow(file);
  else await follower?.read();
}

async function main() {
  say(`… Watching ${LOG_ROOT}/`);
  if (!fs.existsSync(LOG_ROOT)) say("✗ Log folder not found. Is Hearthstone installed in /Applications? (set HS_LOG_DIR to change it)");
  const watcher = watch(LOG_ROOT, { depth: 1, ignoreInitial: true, ignored: (p, stats) => !!stats?.isFile() && path.basename(p) !== "Power.log" });
  watcher.on("all", () => void tick().catch((err: unknown) => say(`✗ ${err instanceof Error ? err.message : String(err)}`)));
  setInterval(() => void tick().catch(() => undefined), POLL_MS);
  await tick();
  if (!follower) say("… No Power.log yet. Start a game and it will appear here.");

  const shutdown = async () => {
    follower?.stop();
    await drain();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err: unknown) => {
  say(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
