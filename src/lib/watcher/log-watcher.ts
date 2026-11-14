import fs from "node:fs";
import path from "node:path";
import { watch, type FSWatcher } from "chokidar";
import { TIME_ZONE } from "@/i18n";
import { PowerLogParser, type DbfLookup } from "@/lib/parser/game-state";
import { cardDbfLookup, sessionOf } from "@/lib/parser/read-file";
import type { GameRecord } from "@/lib/parser/record";
import { TailReader } from "./tail";

/**
 * Follows the newest Hearthstone session's Power.log as it grows, parses it
 * line by line and sends each finished game to the app (POST /api/import/watcher).
 * It never writes the database itself and only ever reads the Hearthstone folder.
 * How far it has read is stored by the server, so a restart carries on where it
 * stopped; anything sent twice is skipped by the duplicate check.
 *
 * Used by `npm run watch:logs` and by the Mac app's main process. Only one may
 * run at a time (see lock.ts).
 */

/** Safety net next to file events: Hearthstone writes in bursts and some writes don't fire an event. */
const POLL_MS = 1000;
const MAX_BACKOFF_S = 30;
/** Settings shows the watcher as running while these keep coming. */
const STATUS_MS = 15_000;

export type WatcherHooks = {
  /** Short English status lines (`✓ New game saved: …`). */
  say: (msg: string) => void;
  /** Every Power.log line, in order. `live` is false while catching up with what was already written. */
  onPowerLine?: (line: string, live: boolean) => void;
  /** A different Power.log (a new Hearthstone session) is being followed from now on. */
  onSessionFile?: (file: string) => void;
  /** After the server answered for a finished game. */
  onGamesSent?: (games: GameRecord[], imported: number) => void;
  /** A game started or ended (live only). */
  onLive?: (inGame: boolean) => void;
  /** Hearthstone was launched: a new session folder appeared. */
  onHearthstoneStarted?: () => void;
};

/** `owner` names this watcher in Settings › Log watcher ("Mac app", "npm run watch:logs"). */
export type WatcherOptions = { owner: string; logRoot: string; appUrl: string; hooks: WatcherHooks; dbfOf?: DbfLookup };

type Job = { path: string; body: unknown; done?: (res: unknown) => void };

const label = (cls: string) => cls.charAt(0) + cls.slice(1).toLowerCase().replace(/_(\w)/g, (_, c: string) => ` ${c.toUpperCase()}`);
const RESULT = { WIN: "Win", LOSS: "Loss", TIE: "Tie" } as const;
export const describeGame = (g: GameRecord) => `${label(g.playerClass)} vs ${label(g.opponentClass)} — ${RESULT[g.result]}`;

export class LogWatcher {
  private readonly queue: Job[] = [];
  private sending = false;
  private readonly dbfOf: DbfLookup;
  private fsWatcher: FSWatcher | null = null;
  private timer: NodeJS.Timeout | null = null;
  private statusTimer: NodeJS.Timeout | null = null;
  private switching = false;
  private stopped = false;

  private file: string | null = null;
  private tail: TailReader | null = null;
  private parser: PowerLogParser | null = null;
  /** Live updates only once we have caught up with what was already written. */
  private caughtUp = false;
  private inGame = false;

  constructor(private readonly opts: WatcherOptions) {
    this.dbfOf = opts.dbfOf ?? cardDbfLookup();
  }

  get currentFile(): string | null {
    return this.file;
  }

  async start(): Promise<void> {
    const { logRoot, hooks } = this.opts;
    hooks.say(`… Watching ${logRoot}/`);
    if (!fs.existsSync(logRoot)) hooks.say("✗ Log folder not found. Is Hearthstone installed in /Applications? (set HS_LOG_DIR to change it)");
    this.fsWatcher = watch(logRoot, { depth: 1, ignoreInitial: true, ignored: (p, stats) => !!stats?.isFile() && path.basename(p) !== "Power.log" });
    this.fsWatcher.on("all", (event, p) => {
      if (event === "addDir" && path.dirname(p) === logRoot && path.basename(p).startsWith("Hearthstone_")) hooks.onHearthstoneStarted?.();
      void this.tick().catch((err: unknown) => hooks.say(`✗ ${err instanceof Error ? err.message : String(err)}`));
    });
    this.timer = setInterval(() => void this.tick().catch(() => undefined), POLL_MS);
    this.statusTimer = setInterval(() => void this.reportStatus(true), STATUS_MS);
    void this.reportStatus(true);
    await this.tick();
    if (!this.file) hooks.say("… No Power.log yet. Start a game and it will appear here.");
  }

  /** Stops watching and waits until everything queued has reached the server (or the server is unreachable). */
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    if (this.statusTimer) clearInterval(this.statusTimer);
    await this.reportStatus(false);
    await this.fsWatcher?.close();
    if (this.inGame) this.enqueue({ path: "/api/watcher/live", body: { inGame: false } });
    await this.drain(true);
  }

  // ---- picking the newest session ----

  /** The Power.log to follow: newest session folder (Hearthstone_YYYY_…), or an old single Logs/Power.log. */
  private newestLog(): string | null {
    const root = this.opts.logRoot;
    if (!fs.existsSync(root)) return null;
    const sessions = fs
      .readdirSync(root)
      .filter((n) => n.startsWith("Hearthstone_"))
      .sort()
      .reverse();
    for (const s of sessions) {
      const file = path.join(root, s, "Power.log");
      if (fs.existsSync(file)) return file;
    }
    const legacy = path.join(root, "Power.log");
    return fs.existsSync(legacy) ? legacy : null;
  }

  private async tick() {
    if (this.stopped) return;
    const file = this.newestLog();
    if (file && file !== this.file) await this.follow(file);
    else await this.readTail();
  }

  private freshParser(file: string) {
    const { session, start } = sessionOf(file, TIME_ZONE);
    return new PowerLogParser({ session, start, timeZone: TIME_ZONE, dbfOf: this.dbfOf });
  }

  private async follow(file: string) {
    if (this.switching) return;
    this.switching = true;
    try {
      if (this.inGame) this.setLive(false);
      const start = await this.savedOffset(file);
      if (this.stopped) return;
      this.opts.hooks.say(`… Reading ${path.relative(this.opts.logRoot, file)}${start ? ` from byte ${start}` : ""}`);
      this.file = file;
      this.parser = this.freshParser(file);
      this.caughtUp = false;
      this.tail = new TailReader(file, start, (line, end) => this.onLine(line, end), () => (this.parser = this.freshParser(file)));
      this.opts.hooks.onSessionFile?.(file);
      void this.reportStatus(true);
      await this.readTail();
    } finally {
      this.switching = false;
    }
  }

  private async readTail() {
    if (!this.tail) return;
    try {
      await this.tail.read();
      if (!this.caughtUp) {
        this.caughtUp = true;
        this.reportLive();
      }
    } catch (err) {
      this.opts.hooks.say(`✗ Could not read ${this.tail.file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private onLine(line: string, endOffset: number) {
    if (!this.parser || !this.file) return;
    this.opts.hooks.onPowerLine?.(line, this.caughtUp);
    const games = this.parser.feed(line);
    if (games.length) this.send(this.file, games, endOffset);
    if (this.caughtUp) this.reportLive();
  }

  private send(file: string, games: GameRecord[], byteOffset: number) {
    this.enqueue({
      path: "/api/import/watcher",
      body: { filePath: file, byteOffset, records: games },
      done: (res) => {
        const { imported } = res as { imported: number };
        this.opts.hooks.say(games.map((g) => (imported ? `✓ New game saved: ${describeGame(g)}` : `· Already saved: ${describeGame(g)}`)).join("\n"));
        this.opts.hooks.onGamesSent?.(games, imported);
      },
    });
    if (this.inGame && !this.parser?.inGame) this.setLive(false, false);
  }

  /** Tells the app when a game starts or ends (Full effects run as Light meanwhile). */
  private reportLive() {
    const now = this.parser?.inGame ?? false;
    if (now !== this.inGame) this.setLive(now);
  }

  private setLive(inGame: boolean, notifyServer = true) {
    this.inGame = inGame;
    if (inGame) this.opts.hooks.say("▶ Game started");
    // A finished game's import already tells the server the game is over.
    if (notifyServer) this.enqueue({ path: "/api/watcher/live", body: { inGame } });
    this.opts.hooks.onLive?.(inGame);
  }

  // ---- talking to the app, with a retry queue ----

  /** Heartbeat for Settings; not queued, the next one replaces a lost one. */
  private async reportStatus(running: boolean) {
    const body = { owner: this.opts.owner, logRoot: this.opts.logRoot, file: this.file, running };
    await this.post("/api/watcher/status", body).catch(() => undefined);
  }

  private async post(urlPath: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${this.opts.appUrl}${urlPath}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  private enqueue(job: Job) {
    this.queue.push(job);
    void this.drain();
  }

  /** Sends queued jobs in order. With `once`, gives up instead of retrying (used on shutdown). */
  private async drain(once = false) {
    if (this.sending) return;
    this.sending = true;
    let backoff = 1;
    try {
      while (this.queue.length) {
        const job = this.queue[0];
        if (!job) break;
        try {
          const res = await this.post(job.path, job.body);
          job.done?.(res);
          this.queue.shift();
          backoff = 1;
        } catch (err) {
          if (err instanceof Error && err.message.startsWith("HTTP 4")) {
            // A request the server refuses won't succeed later either: report it and move on.
            this.opts.hooks.say(`✗ Game could not be saved: rejected (${err.message})`);
            this.queue.shift();
            continue;
          }
          if (once) return;
          this.opts.hooks.say(`✗ Server unreachable, retrying in ${backoff}s`);
          await new Promise((r) => setTimeout(r, backoff * 1000));
          backoff = Math.min(MAX_BACKOFF_S, backoff * 2);
        }
      }
    } finally {
      this.sending = false;
    }
  }

  private async savedOffset(file: string): Promise<number> {
    for (let wait = 1; !this.stopped; wait = Math.min(MAX_BACKOFF_S, wait * 2)) {
      try {
        const res = await fetch(`${this.opts.appUrl}/api/watcher/state?file=${encodeURIComponent(file)}`);
        if (res.ok) return ((await res.json()) as { byteOffset: number }).byteOffset;
      } catch {
        // Server not up yet (dev:all starts both at once).
      }
      this.opts.hooks.say(`✗ Server unreachable, retrying in ${wait}s`);
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
    return 0;
  }
}
