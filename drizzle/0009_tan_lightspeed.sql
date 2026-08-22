ALTER TABLE `course_items` ADD `travelNote` text;--> statement-breakpoint
ALTER TABLE `course_items` ADD `travelPhotoUrl` text;--> statement-breakpoint
ALTER TABLE `course_items` ADD `travelPhotoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `courses` ADD `completedAt` timestamp;