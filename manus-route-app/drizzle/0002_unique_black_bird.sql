ALTER TABLE `courses` ADD `startDate` timestamp;--> statement-breakpoint
ALTER TABLE `courses` ADD `endDate` timestamp;--> statement-breakpoint
ALTER TABLE `courses` ADD `status` enum('planned','active','completed') DEFAULT 'planned' NOT NULL;