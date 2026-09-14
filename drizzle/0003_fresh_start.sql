-- User-requested fresh start for the new challenge. Applied once by the migration ledger.
DROP TABLE daily_runs;
--> statement-breakpoint
DROP TABLE daily_scores;
--> statement-breakpoint
DROP TABLE players;
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`best` integer DEFAULT 0 NOT NULL,
	`achieved_at` integer NOT NULL,
	`last_submit_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_players_ranking` ON `players` ("best" desc,`achieved_at`,`id`);
--> statement-breakpoint
CREATE TABLE `daily_runs` (
	`player_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`day` text NOT NULL,
	`started_at` integer NOT NULL,
	`finish_score` integer,
	`finish_duration` integer,
	`finished_at` integer,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_scores` (
	`day` text NOT NULL,
	`player_id` text NOT NULL,
	`best` integer NOT NULL,
	`achieved_at` integer NOT NULL,
	PRIMARY KEY(`day`, `player_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_daily_ranking` ON `daily_scores` (`day`,"best" desc,`achieved_at`,`player_id`);
--> statement-breakpoint
ALTER TABLE `players` ADD `highest_level` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `furthest_pass` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `achievements` integer DEFAULT 0 NOT NULL;