import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { loadCards } from "@/lib/cards/classes";
import { PowerLogParser, type DbfLookup, type SkippedGame } from "./game-state";
import { scanClock, sessionFromDate, sessionFromFolder, type ClockScan, type SessionStart } from "./time";
import { tokenizeClock } from "./tokenizer";
import type { GameRecord } from "./record";

/** CardID → dbfId for collectible cards, from the local card cache (empty if cards:sync has not run). */
export function cardDbfLookup(): DbfLookup {
  const map = new Map((loadCards() ?? []).map((c) => [c.id, c.dbfId]));
  return (cardId) => map.get(cardId);
}

/**
 * Where a log's date comes from: its session folder (Hearthstone_YYYY_MM_DD_HH_MM_SS/Power.log)
 * or, for an old single-file Logs/Power.log, the file's creation time.
 */
export function sessionOf(filePath: string, timeZone: string) {
  const folder = path.basename(path.dirname(filePath));
  const fromFolder = sessionFromFolder(folder);
  if (fromFolder) return { session: folder, start: fromFolder };
  const stat = fs.statSync(filePath);
  return { session: `${path.basename(filePath)}@${stat.birthtime.toISOString()}`, start: sessionFromDate(stat.birthtime, timeZone) };
}

export type ParseResult = { games: GameRecord[]; skipped: SkippedGame[] };

/** Parses any line stream (a file on disk, an upload) without holding it all in memory. */
export async function parsePowerLogStream(
  input: NodeJS.ReadableStream,
  opts: { session: string; start: SessionStart; timeZone: string; dbfOf?: DbfLookup },
): Promise<ParseResult> {
  const parser = new PowerLogParser({ session: opts.session, start: opts.start, timeZone: opts.timeZone, dbfOf: opts.dbfOf ?? cardDbfLookup() });
  const games: GameRecord[] = [];
  for await (const line of readline.createInterface({ input, crlfDelay: Infinity })) games.push(...parser.feed(line));
  return { games, skipped: parser.skipped };
}

/** Reads a Power.log from disk line by line and returns its finished games. */
export async function parsePowerLogFile(filePath: string, opts: { timeZone: string; dbfOf?: DbfLookup }): Promise<ParseResult> {
  const { session, start } = sessionOf(filePath, opts.timeZone);
  return parsePowerLogStream(fs.createReadStream(filePath), { session, start, timeZone: opts.timeZone, dbfOf: opts.dbfOf });
}

/** First pass for logs without a folder name: line clocks only, to date the session (see sessionFromLastWrite). */
export async function scanLogClock(input: NodeJS.ReadableStream): Promise<ClockScan | null> {
  let scan: ClockScan | null = null;
  for await (const line of readline.createInterface({ input, crlfDelay: Infinity })) {
    const clock = tokenizeClock(line);
    if (clock !== null) scan = scanClock(scan, clock);
  }
  return scan;
}
