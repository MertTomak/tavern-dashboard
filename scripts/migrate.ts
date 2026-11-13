import path from "node:path";
import { migrateDb } from "@/lib/db/migrate";

const { applied, backup } = migrateDb(path.join(process.cwd(), "drizzle"));
if (backup) console.log(`Backup created: ${backup}`);
console.log(applied ? `Migration complete (${applied} applied).` : "Database already up to date.");
