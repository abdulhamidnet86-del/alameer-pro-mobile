CREATE TABLE `telegram_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionKey` varchar(64) NOT NULL,
	`payload` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_settings_connectionKey_unique` UNIQUE(`connectionKey`)
);
