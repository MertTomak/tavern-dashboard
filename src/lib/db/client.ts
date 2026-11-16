import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { loadCards } from "@/lib/cards/classes";
import { fillDemoDatabase } from "@/lib/demo/dataset";
import { IS_DEMO } from "@/lib/demo/mode";
import { DB_FILE } from "@/lib/paths";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const sqlite = new Database(DB_FILE);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

/**
 * Demo mode: a database in memory, built from the demo dataset when the server
 * starts and then made read-only (`query_only`), so no request can change it.
 * The user's database is never opened.
 */
function openDemo(): Database.Database {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  migrate(drizzle(sqlite), { migrationsFolder: path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle") });
  fillDemoDatabase(drizzle(sqlite, { schema }), loadCards() ?? []);
  sqlite.pragma("query_only = ON");
  return sqlite;
}

const sqlite = globalForDb.sqlite ?? (IS_DEMO ? openDemo() : open());
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
