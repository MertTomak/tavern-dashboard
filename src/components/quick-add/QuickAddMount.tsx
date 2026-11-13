import { connection } from "next/server";
import { playableClasses } from "@/lib/cards/catalog";
import { listDeckOptions } from "@/lib/db/queries/decks";
import { quickAddDefaults } from "@/lib/db/queries/games";
import { QuickAddSheet } from "./QuickAddSheet";

/** Loads what Quick add needs on every page; the sheet itself opens from any Quick add button or the N key. */
export async function QuickAddMount() {
  await connection();
  const classes = playableClasses();
  if (!classes.length) return null;
  const defaults = quickAddDefaults();
  // Keyed on the defaults so the sheet starts from the newest game after each save.
  return <QuickAddSheet key={`${defaults.playerClass}-${defaults.deckId}-${defaults.mode}-${defaults.format}`} classes={classes} decks={listDeckOptions()} defaults={defaults} />;
}
