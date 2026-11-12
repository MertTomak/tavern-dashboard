ALTER TABLE `decks` ADD `is_demo` integer DEFAULT false NOT NULL;
--> statement-breakpoint
-- Backfill: group demo rows created by the first seed into a "seed" import batch.
INSERT INTO `import_batches` (`source`, `file_name`, `imported`, `skipped`)
SELECT 'MANUAL', 'seed', COUNT(*), 0 FROM `games` WHERE `source_hash` LIKE 'seed-%' HAVING COUNT(*) > 0;
--> statement-breakpoint
UPDATE `games` SET `import_batch_id` = (SELECT `id` FROM `import_batches` WHERE `file_name` = 'seed' ORDER BY `id` DESC LIMIT 1)
WHERE `source_hash` LIKE 'seed-%';
--> statement-breakpoint
UPDATE `decks` SET `is_demo` = 1 WHERE `id` IN (SELECT DISTINCT `deck_id` FROM `games` WHERE `source_hash` LIKE 'seed-%' AND `deck_id` IS NOT NULL);
