import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { loadCards } from "@/lib/cards/classes";
import { PowerLogParser, type DbfLookup, type SkippedGame } from "./game-state";
import { sessionFromDate, sessionFromFolder } from "./time";
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

/** Reads a Power.log line by line (never whole into memory) and returns its finished games. */
export async function parsePowerLogFile(
  filePath: string,
  opts: { timeZone: string; dbfOf?: DbfLookup },
): Promise<{ games: GameRecord[]; skipped: SkippedGame[] }> {
  const { session, start } = sessionOf(filePath, opts.timeZone);
  const parser = new PowerLogParser({ session, start, timeZone: opts.timeZone, dbfOf: opts.dbfOf ?? cardDbfLookup() });
  const games: GameRecord[] = [];
  const lines = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of lines) games.push(...parser.feed(line));
  return { games, skipped: parser.skipped };
}
