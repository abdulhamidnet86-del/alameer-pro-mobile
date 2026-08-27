CREATE TABLE `card_designs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionKey` varchar(64) NOT NULL,
	`designKey` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT 'عام',
	`payload` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `card_designs_id` PRIMARY KEY(`id`)
);
