CREATE TABLE `follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_id` PRIMARY KEY(`id`),
	CONSTRAINT `follows_follower_following_unique` UNIQUE(`followerId`,`followingId`)
);
--> statement-breakpoint
ALTER TABLE `courses` ADD `sourceCourseId` int;--> statement-breakpoint
ALTER TABLE `saved_places` ADD `customTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `saved_places` ADD `personalPhotoUrl` text;--> statement-breakpoint
ALTER TABLE `saved_places` ADD `personalPhotoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarKey` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `travelStyle` varchar(100);--> statement-breakpoint
CREATE INDEX `follows_follower_idx` ON `follows` (`followerId`);--> statement-breakpoint
CREATE INDEX `follows_following_idx` ON `follows` (`followingId`);