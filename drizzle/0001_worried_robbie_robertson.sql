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