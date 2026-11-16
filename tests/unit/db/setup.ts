import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Points the app at a fresh temporary data folder and migrates it. Call before
 * importing anything that opens the database: the real data is never touched.
 */
export async function useTempDb(): Promise<typeof import("@/lib/db/client")> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tavern-test-"));
  process.env.TAVERN_DATA_DIR = dir;
  // The client caches its connection on globalThis; never reuse one from another test file.
  Reflect.deleteProperty(globalThis, "sqlite");
  const { migrateDb } = await import("@/lib/db/migrate");
  migrateDb(path.join(process.cwd(), "drizzle"), path.join(dir, "hearthstone.db"));
  return import("@/lib/db/client");
}
