ALTER TABLE `players` ADD `highest_level` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `furthest_pass` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `achievements` integer DEFAULT 0 NOT NULL;