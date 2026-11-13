import os from "node:os";
import path from "node:path";

/**
 * Where the app keeps everything it writes: the database, backups, card data and art.
 * TAVERN_DATA_DIR wins (the Mac app sets it); otherwise the project's data/ folder.
 */
export const DATA_DIR = process.env.TAVERN_DATA_DIR ?? path.join(process.cwd(), "data");

export const DB_FILE = path.join(DATA_DIR, "hearthstone.db");
export const BACKUPS_DIR = path.join(DATA_DIR, "backups");
export const CARDS_DIR = path.join(DATA_DIR, "cards");
export const ART_DIR = path.join(DATA_DIR, "art");
/** The Mac app's own folder, the same for the app and for npm scripts. */
export const APP_SUPPORT_DIR = path.join(os.homedir(), "Library", "Application Support", "TavernDashboard");
/**
 * Held by the one process that reads the Hearthstone logs (see src/lib/watcher/lock.ts).
 * Always in the same place, so the app and `npm run dev:all` see each other.
 */
export const WATCHER_LOCK_FILE = process.env.TAVERN_LOCK_FILE ?? path.join(APP_SUPPORT_DIR, "watcher.lock");

/** Hearthstone's log folder; read-only. */
export const DEFAULT_LOG_ROOT = "/Applications/Hearthstone/Logs";
export const LOG_ROOT = process.env.HS_LOG_DIR ?? DEFAULT_LOG_ROOT;
