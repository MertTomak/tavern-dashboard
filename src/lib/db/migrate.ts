import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { DB_FILE } from "@/lib/paths";
import { backupDb } from "./backup";

/** Migrations not yet applied to the database (all of them for a new database). */
function pending(sqlite: Database.Database, migrationsFolder: string): number {
  const journal = JSON.parse(fs.readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8")) as { entries: unknown[] };
  const table = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'").get();
  if (!table) return journal.entries.length;
  const { n } = sqlite.prepare("SELECT COUNT(*) AS n FROM __drizzle_migrations").get() as { n: number };
  return journal.entries.length - n;
}

/**
 * Brings the database up to date. A backup is taken first, but only when there
 * is something to apply, so starting the Mac app does not pile up copies.
 */
export function migrateDb(migrationsFolder: string, dbFile = DB_FILE): { applied: number; backup: string | null } {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const existed = fs.existsSync(dbFile);
  const sqlite = new Database(dbFile);
  try {
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    const todo = pending(sqlite, migrationsFolder);
    if (!todo) return { applied: 0, backup: null };
    const backup = existed ? backupDb(dbFile, path.join(path.dirname(dbFile), "backups")) : null;
    migrate(drizzle(sqlite), { migrationsFolder });
    return { applied: todo, backup };
  } finally {
    sqlite.close();
  }
}
