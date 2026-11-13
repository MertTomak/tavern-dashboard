/**
 * Turns a real Power.log into a test fixture that is safe to commit:
 * - keeps only the GameState lines the parser reads (minus the noisy option lists),
 *   plus a few PowerTaskList lines to prove the parser ignores them;
 * - replaces BattleTags: the log's own player(s) become Player#0001…, everyone else Opponent#0001…;
 * - zeroes Battle.net account ids.
 *
 * Usage: tsx scripts/anonymise-log.ts <source Power.log> <target Power.log>
 * Reads the source only; never touches the Hearthstone folder.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const BATTLETAG = /[\p{L}\p{N}_]+#\d{3,6}/gu;
const OWN_NAME = /GameState\.DebugPrintGame\(\) - PlayerID=\d+, PlayerName=([\p{L}\p{N}_]+#\d{3,6})/u;
const ACCOUNT = /GameAccountId=\[hi=\d+ lo=(\d+)\]/g;
const KEEP = /GameState\.(DebugPrintPower|DebugPrintGame|DebugPrintEntityChoices|DebugPrintEntitiesChosen|SendChoices)\(\)/;
const TASKLIST_SAMPLE = 40;

async function main() {
  const [source, target] = process.argv.slice(2);
  if (!source || !target) {
    console.error("Usage: tsx scripts/anonymise-log.ts <source Power.log> <target Power.log>");
    process.exit(1);
  }

  // First pass: who is "me"? DebugPrintGame names the local player; opponents show as UNKNOWN HUMAN PLAYER there.
  const own = new Set<string>();
  for await (const line of readline.createInterface({ input: fs.createReadStream(source) })) {
    const m = OWN_NAME.exec(line);
    if (m?.[1]) own.add(m[1]);
  }

  const names = new Map<string, string>();
  const accounts = new Map<string, string>();
  let players = 0;
  let opponents = 0;
  const nameFor = (tag: string) => {
    let n = names.get(tag);
    if (!n) {
      n = own.has(tag) ? `Player#${String(++players).padStart(4, "0")}` : `Opponent#${String(++opponents).padStart(4, "0")}`;
      names.set(tag, n);
    }
    return n;
  };
  const accountFor = (lo: string) => {
    let n = accounts.get(lo);
    if (!n) {
      n = String(accounts.size + 1);
      accounts.set(lo, n);
    }
    return n;
  };

  fs.mkdirSync(path.dirname(target), { recursive: true });
  const out = fs.createWriteStream(target);
  let taskList = 0;
  let kept = 0;
  for await (const line of readline.createInterface({ input: fs.createReadStream(source) })) {
    const keep = KEEP.test(line) || (line.includes("PowerTaskList.DebugPrintPower()") && taskList++ < TASKLIST_SAMPLE);
    if (!keep) continue;
    out.write(line.replace(BATTLETAG, nameFor).replace(ACCOUNT, (_, lo: string) => `GameAccountId=[hi=0 lo=${accountFor(lo)}]`) + "\n");
    kept++;
  }
  out.end();
  console.log(`✓ Wrote ${kept} lines to ${target} (${names.size} BattleTags and ${accounts.size} account ids replaced)`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
