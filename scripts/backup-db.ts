import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "data", "hearthstone.db");
const BACKUPS = path.join(process.cwd(), "data", "backups");

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function backupDb(): string | null {
  if (!fs.existsSync(DB)) return null;
  fs.mkdirSync(BACKUPS, { recursive: true });
  const target = path.join(BACKUPS, `hearthstone-${stamp()}.db`);
  fs.copyFileSync(DB, target);
  return target;
}

if (process.argv[1]?.endsWith("backup-db.ts")) {
  const out = backupDb();
  console.log(out ? `Yedek alındı: ${out}` : "Henüz veritabanı yok, yedek gerekmedi.");
}
