import { backupDb } from "@/lib/db/backup";

const out = backupDb();
console.log(out ? `Backup created: ${out}` : "No database yet, no backup needed.");
