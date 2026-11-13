import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DB = path.join(process.cwd(), "data", "hearthstone.db");
const BACKUPS = path.join(process.cwd(), "data", "backups");

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Copies the database with `VACUUM INTO`, a consistent snapshot that includes
 * recent writes. A plain file copy misses them: in WAL mode they live in
 * hearthstone.db-wal until a checkpoint.
 */
export function backupDb(): string | null {
  if (!fs.existsSync(DB)) return null;
  fs.mkdirSync(BACKUPS, { recursive: true });
  const target = path.join(BACKUPS, `hearthstone-${stamp()}.db`);
  const source = new Database(DB, { readonly: true, fileMustExist: true });
  try {
    source.prepare("VACUUM INTO ?").run(target);
  } finally {
    source.close();
  }
  return target;
}

if (process.argv[1]?.endsWith("backup-db.ts")) {
  const out = backupDb();
  console.log(out ? `Backup created: ${out}` : "No database yet, no backup needed.");
}
