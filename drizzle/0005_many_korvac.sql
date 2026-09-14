CREATE TABLE `friend_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`invite` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friend_groups_invite_unique` ON `friend_groups` (`invite`);--> statement-breakpoint
CREATE TABLE `friend_members` (
	`group_id` text NOT NULL,
	`player_id` text NOT NULL,
	PRIMARY KEY(`group_id`, `player_id`),
	FOREIGN KEY (`group_id`) REFERENCES `friend_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_friend_owner` ON `friend_members` (`player_id`);--> statement-breakpoint
CREATE TABLE `social_limits` (
	`player_id` text NOT NULL,
	`action` text NOT NULL,
	`bucket` integer NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`player_id`, `action`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `social_runs` (
	`token` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`kind` text NOT NULL,
	`week` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`payload` text,
	`sparks` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_community_week` ON `social_runs` (`week`,`finished_at`);--> statement-breakpoint
CREATE INDEX `idx_social_owner` ON `social_runs` (`player_id`,`week`);--> statement-breakpoint
CREATE TABLE `weekly_runs` (
	`token` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`week` text NOT NULL,
	`started_at` integer NOT NULL,
	`finish_score` integer,
	`finish_duration` integer,
	`finished_at` integer,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_weekly_runs_owner` ON `weekly_runs` (`player_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `weekly_scores` (
	`week` text NOT NULL,
	`player_id` text NOT NULL,
	`best` integer NOT NULL,
	`achieved_at` integer NOT NULL,
	PRIMARY KEY(`week`, `player_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_weekly_ranking` ON `weekly_scores` (`week`,"best" desc,`achieved_at`,`player_id`);--> statement-breakpoint
ALTER TABLE `players` ADD `boss_trophies` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `player_titles` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `selected_title` text DEFAULT '' NOT NULL;
--> statement-breakpoint
-- Preserve earlier progress: each 120 passed barriers means another boss cleared.
UPDATE players SET boss_trophies=(1 << MIN(10,CAST(furthest_pass/120 AS INTEGER)))-1,
player_titles=(CASE WHEN best_chain>=5 THEN 1 ELSE 0 END) | (CASE WHEN best_clean>=5 THEN 2 ELSE 0 END) | (CASE WHEN furthest_pass>=156 THEN 4 ELSE 0 END);
