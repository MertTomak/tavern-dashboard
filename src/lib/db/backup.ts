import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { BACKUPS_DIR, DB_FILE } from "@/lib/paths";

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Copies the database with `VACUUM INTO`, a consistent snapshot that includes
 * recent writes. A plain file copy misses them: in WAL mode they live in
 * hearthstone.db-wal until a checkpoint.
 */
export function backupDb(dbFile = DB_FILE, backupsDir = BACKUPS_DIR): string | null {
  if (!fs.existsSync(dbFile)) return null;
  fs.mkdirSync(backupsDir, { recursive: true });
  const target = path.join(backupsDir, `hearthstone-${stamp()}.db`);
  const source = new Database(dbFile, { readonly: true, fileMustExist: true });
  try {
    source.prepare("VACUUM INTO ?").run(target);
  } finally {
    source.close();
  }
  return target;
}
