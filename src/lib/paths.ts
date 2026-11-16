import os from "node:os";
import path from "node:path";
import { IS_DEMO } from "@/lib/demo/mode";

/** The Mac app's own folder, the same for the app and for npm scripts. */
export const APP_SUPPORT_DIR = path.join(os.homedir(), "Library", "Application Support", "TavernDashboard");
/**
 * Where the app keeps everything it writes: the database, backups, card data and art.
 * One place for the Mac app and `npm run dev` alike; TAVERN_DATA_DIR overrides it (tests).
 */
export const DATA_DIR = process.env.TAVERN_DATA_DIR ?? APP_SUPPORT_DIR;

/**
 * Demo mode never touches the user's folder: card data comes with the build
 * (`npm run demo:prepare` writes `.demo-data/cards/`), the database lives in
 * memory (src/lib/demo/dataset.ts) and art is cached in the temp folder, the
 * only writable place on a host like Vercel.
 */
export const DEMO_DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), ".demo-data");

export const DB_FILE = path.join(DATA_DIR, "hearthstone.db");
export const BACKUPS_DIR = path.join(DATA_DIR, "backups");
export const CARDS_DIR = IS_DEMO ? path.join(DEMO_DATA_DIR, "cards") : path.join(DATA_DIR, "cards");
export const ART_DIR = IS_DEMO ? path.join(os.tmpdir(), "tavern-demo-art") : path.join(DATA_DIR, "art");
/**
 * Held by the one process that reads the Hearthstone logs (see src/lib/watcher/lock.ts).
 * Always in the same place, so the app and `npm run dev:all` see each other.
 */
export const WATCHER_LOCK_FILE = process.env.TAVERN_LOCK_FILE ?? path.join(APP_SUPPORT_DIR, "watcher.lock");

/** Hearthstone's log folder; read-only. */
export const DEFAULT_LOG_ROOT = "/Applications/Hearthstone/Logs";
export const LOG_ROOT = process.env.HS_LOG_DIR ?? DEFAULT_LOG_ROOT;
/** Hearthstone's log settings; changed only after the user approves (Settings › Game logs). */
export const LOG_CONFIG_FILE = process.env.HS_LOG_CONFIG ?? path.join(os.homedir(), "Library", "Preferences", "Blizzard", "Hearthstone", "log.config");
