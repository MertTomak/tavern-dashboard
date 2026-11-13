/**
 * Runs in the Mac app's server process (an Electron utility process): brings
 * the database up to date, then starts the bundled Next.js standalone server.
 * Lives next to server.js so better-sqlite3 resolves from its node_modules.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { migrateDb } from "@/lib/db/migrate";

const { applied, backup } = migrateDb(path.join(__dirname, "drizzle"));
if (applied) console.log(`Database migrated (${applied} applied, backup ${backup ?? "not needed"}).`);
void import(pathToFileURL(path.join(__dirname, "server.js")).href);
