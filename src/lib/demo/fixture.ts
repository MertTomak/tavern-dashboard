import fs from "node:fs";
import path from "node:path";
import { TIME_ZONE } from "@/i18n";
import { PowerLogParser, type DbfLookup } from "@/lib/parser/game-state";
import type { GameRecord } from "@/lib/parser/record";
import { sessionFromFolder } from "@/lib/parser/time";

/** The anonymised Power.log the tests use; the demo shows its games and replays them in the tracker. */
export const FIXTURE_SESSION = "Hearthstone_2026_11_13_22_32_43";
export const FIXTURE_LOG = path.join(/* turbopackIgnore: true */ process.cwd(), "tests", "fixtures", "power-logs", FIXTURE_SESSION, "Power.log");

export function fixtureLines(): string[] {
  return fs.readFileSync(FIXTURE_LOG, "utf8").split(/\r?\n/);
}

/** The fixture's finished games, parsed the way an import would. */
export function fixtureGames(dbfOf: DbfLookup): GameRecord[] {
  const start = sessionFromFolder(FIXTURE_SESSION);
  if (!start) return [];
  const parser = new PowerLogParser({ session: FIXTURE_SESSION, start, timeZone: TIME_ZONE, dbfOf });
  return fixtureLines().flatMap((line) => parser.feed(line));
}
