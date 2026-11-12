import { clearDemoData, getDemoCounts } from "../src/lib/db/queries/demo";
import { backupDb } from "./backup-db";

const before = getDemoCounts();
if (before.games === 0 && before.decks === 0) {
  console.log("No demo data to delete.");
} else {
  const backup = backupDb();
  if (backup) console.log(`Backup created: ${backup}`);
  const removed = clearDemoData();
  console.log(`Deleted ${removed.games} demo games and ${removed.decks} demo decks. Your real data was kept.`);
}
