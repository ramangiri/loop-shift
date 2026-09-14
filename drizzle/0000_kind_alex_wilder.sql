CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`best` integer DEFAULT 0 NOT NULL,
	`achieved_at` integer NOT NULL,
	`last_submit_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_players_ranking` ON `players` ("best" desc,`achieved_at`,`id`);