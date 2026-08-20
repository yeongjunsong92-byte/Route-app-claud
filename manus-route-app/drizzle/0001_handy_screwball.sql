CREATE TABLE `course_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`placeId` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`address` text,
	`imageUrl` text,
	`lat` double,
	`lng` double,
	`orderIndex` int NOT NULL,
	`visitTime` varchar(10),
	`durationMinutes` int,
	`estimatedCost` int,
	`note` text,
	CONSTRAINT `course_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_saves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `course_saves_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_saves_user_course_unique` UNIQUE(`userId`,`courseId`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`region` varchar(100),
	`description` text,
	`coverImage` text,
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_places` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`placeId` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`address` text,
	`imageUrl` text,
	`lat` double,
	`lng` double,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_places_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_places_user_place_unique` UNIQUE(`userId`,`placeId`)
);
--> statement-breakpoint
CREATE INDEX `course_items_course_idx` ON `course_items` (`courseId`);--> statement-breakpoint
CREATE INDEX `course_saves_user_idx` ON `course_saves` (`userId`);--> statement-breakpoint
CREATE INDEX `courses_owner_idx` ON `courses` (`ownerId`);--> statement-breakpoint
CREATE INDEX `courses_public_idx` ON `courses` (`isPublic`);--> statement-breakpoint
CREATE INDEX `saved_places_user_idx` ON `saved_places` (`userId`);