import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { backupDb } from "./backup-db";

const backup = backupDb();
if (backup) console.log(`Yedek alındı: ${backup}`);

const sqlite = new Database(path.join(process.cwd(), "data", "hearthstone.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
migrate(drizzle(sqlite), { migrationsFolder: path.join(process.cwd(), "drizzle") });
sqlite.close();
console.log("Migration tamam.");
