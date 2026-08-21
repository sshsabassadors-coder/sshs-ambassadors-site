CREATE TABLE `tour_note_images` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`image_key` text NOT NULL,
	`image_name` text NOT NULL,
	`sort_index` integer NOT NULL,
	`created_at` text NOT NULL
);
