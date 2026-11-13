import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
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

const sqlite = globalForDb.sqlite ?? open();
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
