/**
 * Gets card data for demo mode into .demo-data/cards/ (never committed): from
 * HearthstoneJSON, once. Run by `npm run dev:demo` and `npm run build:demo`.
 *
 *   NEXT_PUBLIC_DEMO=1 npx tsx scripts/demo-prepare.ts
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { IS_DEMO } from "../src/lib/demo/mode";
import { CARDS_FILE } from "../src/lib/cards/classes";
import { ALL_CARDS_FILE } from "../src/lib/cards/all-cards";

if (!IS_DEMO) {
  console.error("Run with NEXT_PUBLIC_DEMO=1, so card data goes to .demo-data/ and not to your data folder.");
  process.exit(1);
}
if (fs.existsSync(CARDS_FILE) && fs.existsSync(ALL_CARDS_FILE)) {
  console.log("✓ Demo card data is already there.");
} else {
  execFileSync(process.execPath, ["--import", "tsx", "scripts/sync-cards.ts"], { stdio: "inherit", env: process.env });
}
