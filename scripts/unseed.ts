import { clearDemoData, getDemoCounts } from "../src/lib/db/queries/demo";
import { backupDb } from "./backup-db";

const before = getDemoCounts();
if (before.games === 0 && before.decks === 0) {
  console.log("Silinecek demo verisi yok.");
} else {
  const backup = backupDb();
  if (backup) console.log(`Yedek alındı: ${backup}`);
  const removed = clearDemoData();
  console.log(`${removed.games} demo maç ve ${removed.decks} demo deste silindi. Gerçek verilerin korundu.`);
}
