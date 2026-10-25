CREATE TABLE `completions` (
	`id` text PRIMARY KEY NOT NULL,
	`passage_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`passage_id`) REFERENCES `passages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `passages` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`voice` text NOT NULL,
	`images` text NOT NULL,
	`audio_key` text NOT NULL,
	`duration` real NOT NULL,
	`goal` integer DEFAULT 5 NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text
);

--> statement-breakpoint
CREATE INDEX completions_passage_id_idx ON completions(passage_id);
--> statement-breakpoint
CREATE TRIGGER finalized_passage_immutable BEFORE UPDATE OF id,title,body,voice,images,audio_key,duration,created_at ON passages
BEGIN
 SELECT RAISE(ABORT, 'Finalized passages are immutable. Add a new passage instead.');
END;
