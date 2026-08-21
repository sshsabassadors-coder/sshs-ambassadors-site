CREATE TABLE `archive_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`year` integer NOT NULL,
	`date` text NOT NULL,
	`title_ko` text NOT NULL,
	`title_en` text NOT NULL,
	`summary_ko` text NOT NULL,
	`summary_en` text NOT NULL,
	`file_key` text,
	`file_name` text,
	`file_type` text,
	`file_size` integer,
	`author_email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tour_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`route_id` text NOT NULL,
	`stop_slug` text NOT NULL,
	`body_ko` text NOT NULL,
	`body_en` text NOT NULL,
	`image_key` text,
	`image_name` text,
	`author_email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tour_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`sort_index` integer NOT NULL,
	`created_at` text NOT NULL
);
