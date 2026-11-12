CREATE TABLE `archetypes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`player_class` text NOT NULL,
	`signature_cards` text DEFAULT '[]' NOT NULL,
	`min_matches` integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `arena_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_class` text NOT NULL,
	`started_at` text NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`finished` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bg_games` (
	`game_id` text PRIMARY KEY NOT NULL,
	`hero_card_id` text NOT NULL,
	`placement` integer NOT NULL,
	`mmr_before` integer,
	`mmr_after` integer,
	`tribes` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `deck_cards` (
	`deck_version_id` integer NOT NULL,
	`dbf_id` integer NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`deck_version_id`, `dbf_id`),
	FOREIGN KEY (`deck_version_id`) REFERENCES `deck_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `deck_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_id` integer NOT NULL,
	`version_no` integer NOT NULL,
	`deckstring` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_versions_deckstring_uq` ON `deck_versions` (`deckstring`);--> statement-breakpoint
CREATE TABLE `decks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`player_class` text NOT NULL,
	`format` text NOT NULL,
	`archetype_id` integer,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`archetype_id`) REFERENCES `archetypes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_card_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`side` text NOT NULL,
	`dbf_id` integer NOT NULL,
	`event` text NOT NULL,
	`turn` integer,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_card_events_game_idx` ON `game_card_events` (`game_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`played_at` text NOT NULL,
	`mode` text NOT NULL,
	`format` text,
	`result` text NOT NULL,
	`player_class` text NOT NULL,
	`opponent_class` text NOT NULL,
	`opponent_archetype_id` integer,
	`deck_id` integer,
	`deck_version_id` integer,
	`went_first` integer,
	`turns` integer,
	`duration_sec` integer,
	`rank_before` real,
	`rank_after` real,
	`legend_rank` integer,
	`arena_run_id` integer,
	`source` text NOT NULL,
	`source_hash` text NOT NULL,
	`import_batch_id` integer,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`opponent_archetype_id`) REFERENCES `archetypes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deck_version_id`) REFERENCES `deck_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`arena_run_id`) REFERENCES `arena_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`import_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_source_hash_uq` ON `games` (`source_hash`);--> statement-breakpoint
CREATE INDEX `games_played_at_idx` ON `games` (`played_at`);--> statement-breakpoint
CREATE INDEX `games_deck_idx` ON `games` (`deck_id`);--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`file_name` text,
	`imported` integer DEFAULT 0 NOT NULL,
	`skipped` integer DEFAULT 0 NOT NULL,
	`errors` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `watcher_state` (
	`file_path` text PRIMARY KEY NOT NULL,
	`byte_offset` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
