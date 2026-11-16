import { archetypeKey } from "./archetypes";
import { winRate, type GameResult, type WinRate } from "./winrate";

export type MatchupGame = {
  result: GameResult;
  playerClass: string;
  opponentClass: string;
  /** Null when no archetype fits their cards ("Unknown {Class}"). */
  opponentArchetypeId: number | null;
  opponentArchetype: string | null;
  deckId: number | null;
  deckName: string | null;
};

export type MatchupBy = "deck" | "class";
/** Columns: opponent classes, or opponent archetypes (unknown ones per class). */
export type MatchupOpp = "class" | "archetype";

/** What a column stands for: the opponent's class, and the archetype name (null = class column, or unknown archetype). */
export type MatchupColumn = { key: string; cls: string; archetype: string | null };

export type MatchupRow = {
  /** Deck id as text, "none" for games without a deck, or my class. */
  key: string;
  /** Deck name (null = no deck) or null in class mode (the class itself is the label). */
  deckName: string | null;
  /** My class for this row. */
  cls: string;
  total: WinRate;
  /** Column key → record against it; columns never faced are absent. */
  cells: Record<string, WinRate>;
};

export type MatchupMatrix = {
  /** Column keys (opponent class, or archetype key), most faced first. */
  columns: string[];
  /** Column key → its class and archetype name. */
  columnInfo: Record<string, MatchupColumn>;
  /** My decks (or classes), most played first. */
  rows: MatchupRow[];
  /** Every row together, per column. */
  totals: Record<string, WinRate>;
  overall: WinRate;
};

const NO_DECK = "none";

/**
 * Matchup matrix: my decks (or my classes) against each opponent class, or
 * each opponent archetype. Every cell is a full win rate (rate, n, lowSample);
 * ties never count.
 */
export function buildMatchups(games: readonly MatchupGame[], by: MatchupBy, opp: MatchupOpp = "class"): MatchupMatrix {
  const colKey = (g: MatchupGame) => (opp === "class" ? g.opponentClass : archetypeKey(g.opponentArchetypeId, g.opponentClass));
  const columnInfo: Record<string, MatchupColumn> = {};
  const rowKey = (g: MatchupGame) => (by === "class" ? g.playerClass : g.deckId === null ? `${NO_DECK}:${g.playerClass}` : String(g.deckId));
  const groups = new Map<string, MatchupGame[]>();
  const byOpponent = new Map<string, GameResult[]>();
  for (const g of games) {
    groups.set(rowKey(g), [...(groups.get(rowKey(g)) ?? []), g]);
    const col = colKey(g);
    byOpponent.set(col, [...(byOpponent.get(col) ?? []), g.result]);
    columnInfo[col] ??= { key: col, cls: g.opponentClass, archetype: opp === "archetype" ? g.opponentArchetype : null };
  }

  const columns = [...byOpponent.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([cls]) => cls);

  const played = (r: MatchupRow) => r.total.n + r.total.ties;
  const rows = [...groups.entries()]
    .map(([key, list]): MatchupRow => {
      const cells: Record<string, WinRate> = {};
      for (const cls of columns) {
        const results = list.filter((g) => colKey(g) === cls).map((g) => g.result);
        if (results.length) cells[cls] = winRate(results);
      }
      // The newest name wins if a deck was renamed between games.
      const last = list[list.length - 1];
      return { key, deckName: by === "deck" ? last.deckName : null, cls: last.playerClass, total: winRate(list.map((g) => g.result)), cells };
    })
    .sort((a, b) => played(b) - played(a) || a.key.localeCompare(b.key));

  return {
    columns,
    columnInfo,
    rows,
    totals: Object.fromEntries([...byOpponent.entries()].map(([cls, results]) => [cls, winRate(results)])),
    overall: winRate(games.map((g) => g.result)),
  };
}
