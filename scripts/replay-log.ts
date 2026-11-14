/**
 * Replays a recorded Power.log (and Decks.log, if there is one next to it) into a
 * fake Hearthstone log folder at the speed it was written, so the watcher and the
 * deck tracker can be tried without the game:
 *
 *   npx tsx scripts/replay-log.ts <Power.log> <out folder> [--speed 4] [--from-line 0]
 *
 * Point the app at the out folder with HS_LOG_DIR=<out folder> (and use a separate
 * TAVERN_DATA_DIR, so replayed games do not land in your real database).
 * Never write into the real Hearthstone folder.
 */
import fs from "node:fs";
import path from "node:path";
import { tokenizeClock } from "@/lib/parser/tokenizer";

const [source, out] = process.argv.slice(2).filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));
const flag = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : fallback;
};
const speed = flag("speed", 1);
const fromLine = flag("from-line", 0);

if (!source || !out) {
  console.error("Usage: npx tsx scripts/replay-log.ts <Power.log> <out folder> [--speed 4] [--from-line 0]");
  process.exit(1);
}
if (path.resolve(out).startsWith("/Applications/Hearthstone")) {
  console.error("✗ Refusing to write into the Hearthstone folder.");
  process.exit(1);
}

const p = (n: number) => String(n).padStart(2, "0");
const now = new Date();
const folder = path.join(out, `Hearthstone_${now.getFullYear()}_${p(now.getMonth() + 1)}_${p(now.getDate())}_${p(now.getHours())}_${p(now.getMinutes())}_${p(now.getSeconds())}`);
fs.mkdirSync(folder, { recursive: true });

const decks = path.join(path.dirname(source), "Decks.log");
if (fs.existsSync(decks)) fs.copyFileSync(decks, path.join(folder, "Decks.log"));

const lines = fs.readFileSync(source, "utf8").split("\n").slice(fromLine);
const target = path.join(folder, "Power.log");
const fd = fs.openSync(target, "a");
console.log(`… Replaying ${lines.length} lines into ${target} at ${speed}× speed`);

void (async () => {
  let lastClock: number | null = null;
  let batch: string[] = [];
  const flush = () => {
    if (batch.length) fs.writeSync(fd, `${batch.join("\n")}\n`);
    batch = [];
  };
  for (const [i, line] of lines.entries()) {
    const clock = tokenizeClock(line);
    if (clock !== null && lastClock !== null && clock > lastClock) {
      // Lines with the same timestamp are written together, as the game does.
      flush();
      await new Promise((r) => setTimeout(r, Math.min(5000, (clock - lastClock!) / speed)));
    }
    if (clock !== null) lastClock = clock;
    batch.push(line);
    if (i % 2000 === 0) console.log(`  line ${i}`);
  }
  flush();
  fs.closeSync(fd);
  console.log("✓ Replay finished");
})();
