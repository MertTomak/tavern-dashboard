/**
 * One-off (2026-11-14): moves the app's data from the project's data/ folder to
 * ~/Library/Application Support/TavernDashboard, the one place the Mac app and
 * `npm run dev` now share. Never overwrites: stops if a database is already there.
 * The old data/ folder is left untouched (a backup is taken first); delete it
 * by hand once the app works.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { backupDb } from "@/lib/db/backup";
import { APP_SUPPORT_DIR } from "@/lib/paths";

const OLD = path.resolve("data");
const oldDb = path.join(OLD, "hearthstone.db");
const newDb = path.join(APP_SUPPORT_DIR, "hearthstone.db");

function counts(file: string) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const n = (table: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
    return { games: n("games"), decks: n("decks"), events: n("game_card_events") };
  } finally {
    db.close();
  }
}

if (!fs.existsSync(oldDb)) {
  console.log(`No database in ${OLD}, nothing to move.`);
  process.exit(0);
}
if (fs.existsSync(newDb)) {
  console.error(`✗ ${newDb} already exists. Not overwriting it; move or remove it by hand first.`);
  process.exit(1);
}

const backup = backupDb(oldDb, path.join(OLD, "backups"));
console.log(`Backup created: ${backup}`);

fs.mkdirSync(APP_SUPPORT_DIR, { recursive: true });
const source = new Database(oldDb, { readonly: true, fileMustExist: true });
try {
  source.prepare("VACUUM INTO ?").run(newDb);
} finally {
  source.close();
}

const before = counts(oldDb);
const after = counts(newDb);
if (JSON.stringify(before) !== JSON.stringify(after)) {
  fs.rmSync(newDb);
  console.error(`✗ Copy does not match (${JSON.stringify(before)} vs ${JSON.stringify(after)}). Nothing changed.`);
  process.exit(1);
}
console.log(`Database copied: ${after.games} games, ${after.decks} decks, ${after.events} card events.`);

// Card data and art are caches; copy them so nothing has to be downloaded again.
for (const dir of ["cards", "art"]) {
  const from = path.join(OLD, dir);
  if (fs.existsSync(from)) execFileSync("cp", ["-R", from, path.join(APP_SUPPORT_DIR, dir)]);
}
console.log(`Done. Data now lives in ${APP_SUPPORT_DIR}. The old ${OLD} folder was left as it was.`);
