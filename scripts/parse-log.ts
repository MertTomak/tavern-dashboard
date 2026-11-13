/**
 * Prints what the parser finds in a Power.log, without saving anything.
 * Usage: tsx scripts/parse-log.ts <Power.log> [--json]
 */
import { parsePowerLogFile } from "@/lib/parser/read-file";
import { TIME_ZONE } from "@/i18n";

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) {
    console.error("Usage: tsx scripts/parse-log.ts <Power.log> [--json]");
    process.exit(1);
  }
  const { games, skipped } = await parsePowerLogFile(file, { timeZone: TIME_ZONE });
  if (flag === "--json") {
    console.log(JSON.stringify({ games, skipped }, null, 2));
    return;
  }
  const time = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" });
  for (const [i, g] of games.entries()) {
    const counts = g.cardEvents.reduce<Record<string, number>>((acc, e) => ((acc[`${e.side[0]}:${e.event}`] = (acc[`${e.side[0]}:${e.event}`] ?? 0) + 1), acc), {});
    console.log(
      [
        `#${i + 1} ${time(g.startedAt)}`,
        `${g.mode}/${g.format ?? "-"}`,
        `${g.playerClass} vs ${g.opponentClass}`,
        g.result + (g.conceded ? ` (${g.conceded === "FRIENDLY" ? "you conceded" : "opponent conceded"})` : ""),
        g.wentFirst === null ? "first: ?" : g.wentFirst ? "first" : "coin",
        `${g.turns} turns (${g.gameTurns})`,
        `${Math.floor(g.durationSec / 60)}m ${g.durationSec % 60}s`,
        JSON.stringify(counts),
      ].join(" | "),
    );
  }
  for (const s of skipped) console.log(`skipped ${time(s.startedAt)}: ${s.reason}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
