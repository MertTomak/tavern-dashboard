import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const GAME_MODES = [
  "RANKED",
  "CASUAL",
  "ARENA",
  "BATTLEGROUNDS",
  "BATTLEGROUNDS_DUOS",
  "BRAWL",
  "FRIENDLY",
  "OTHER",
] as const;
export const GAME_FORMATS = ["STANDARD", "WILD", "TWIST", "CLASSIC"] as const;
export const GAME_RESULTS = ["WIN", "LOSS", "TIE"] as const;
export const GAME_SOURCES = ["MANUAL", "CSV", "JSON", "POWER_LOG", "WATCHER"] as const;
export const CARD_SIDES = ["FRIENDLY", "OPPOSING"] as const;
export const CARD_EVENTS = [
  "MULLIGAN_KEPT",
  "MULLIGAN_REPLACED",
  "DRAWN",
  "PLAYED",
  "REVEALED",
] as const;

const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const archetypes = sqliteTable("archetypes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  playerClass: text("player_class").notNull(),
  signatureCards: text("signature_cards", { mode: "json" }).$type<number[]>().notNull().default(sql`'[]'`),
  minMatches: integer("min_matches").notNull().default(2),
});

export const decks = sqliteTable("decks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  playerClass: text("player_class").notNull(),
  format: text("format", { enum: GAME_FORMATS }).notNull(),
  archetypeId: integer("archetype_id").references(() => archetypes.id),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(nowIso),
});

export const deckVersions = sqliteTable(
  "deck_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deckId: integer("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    deckstring: text("deckstring").notNull(),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => [uniqueIndex("deck_versions_deckstring_uq").on(t.deckstring)],
);

export const deckCards = sqliteTable(
  "deck_cards",
  {
    deckVersionId: integer("deck_version_id")
      .notNull()
      .references(() => deckVersions.id, { onDelete: "cascade" }),
    dbfId: integer("dbf_id").notNull(),
    count: integer("count").notNull(),
  },
  (t) => [primaryKey({ columns: [t.deckVersionId, t.dbfId] })],
);

export const importBatches = sqliteTable("import_batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source", { enum: GAME_SOURCES }).notNull(),
  fileName: text("file_name"),
  imported: integer("imported").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  errors: text("errors", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  createdAt: text("created_at").notNull().default(nowIso),
});

export const arenaRuns = sqliteTable("arena_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerClass: text("player_class").notNull(),
  startedAt: text("started_at").notNull(),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  finished: integer("finished", { mode: "boolean" }).notNull().default(false),
});

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    playedAt: text("played_at").notNull(),
    mode: text("mode", { enum: GAME_MODES }).notNull(),
    format: text("format", { enum: GAME_FORMATS }),
    result: text("result", { enum: GAME_RESULTS }).notNull(),
    playerClass: text("player_class").notNull(),
    opponentClass: text("opponent_class").notNull(),
    opponentArchetypeId: integer("opponent_archetype_id").references(() => archetypes.id),
    deckId: integer("deck_id").references(() => decks.id),
    deckVersionId: integer("deck_version_id").references(() => deckVersions.id),
    wentFirst: integer("went_first", { mode: "boolean" }),
    turns: integer("turns"),
    durationSec: integer("duration_sec"),
    rankBefore: real("rank_before"),
    rankAfter: real("rank_after"),
    legendRank: integer("legend_rank"),
    arenaRunId: integer("arena_run_id").references(() => arenaRuns.id),
    source: text("source", { enum: GAME_SOURCES }).notNull(),
    sourceHash: text("source_hash").notNull(),
    importBatchId: integer("import_batch_id").references(() => importBatches.id),
    notes: text("notes"),
    createdAt: text("created_at").notNull().default(nowIso),
    updatedAt: text("updated_at").notNull().default(nowIso),
  },
  (t) => [
    uniqueIndex("games_source_hash_uq").on(t.sourceHash),
    index("games_played_at_idx").on(t.playedAt),
    index("games_deck_idx").on(t.deckId),
  ],
);

export const gameCardEvents = sqliteTable(
  "game_card_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    side: text("side", { enum: CARD_SIDES }).notNull(),
    dbfId: integer("dbf_id").notNull(),
    event: text("event", { enum: CARD_EVENTS }).notNull(),
    turn: integer("turn"),
  },
  (t) => [index("game_card_events_game_idx").on(t.gameId)],
);

export const bgGames = sqliteTable("bg_games", {
  gameId: text("game_id").primaryKey().references(() => games.id, { onDelete: "cascade" }),
  heroCardId: text("hero_card_id").notNull(),
  placement: integer("placement").notNull(),
  mmrBefore: integer("mmr_before"),
  mmrAfter: integer("mmr_after"),
  tribes: text("tribes", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
});

export const watcherState = sqliteTable("watcher_state", {
  filePath: text("file_path").primaryKey(),
  byteOffset: integer("byte_offset").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(nowIso),
});
