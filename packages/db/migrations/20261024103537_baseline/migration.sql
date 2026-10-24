CREATE TABLE `areas` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contexts` (
	`color` text NOT NULL,
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`all_day` integer DEFAULT false NOT NULL,
	`end_at` text NOT NULL,
	`id` text PRIMARY KEY,
	`kind` text NOT NULL,
	`start` text NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`area_id` text,
	`created_at` text NOT NULL,
	`deadline` text,
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`outcome` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	CONSTRAINT `fk_projects_area_id_areas_id_fk` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `review_steps` (
	`step_id` text PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`block_end` text,
	`block_start` text,
	`captured_at` text NOT NULL,
	`completed_at` text,
	`context_id` text,
	`deadline` text,
	`energy` text,
	`follow_up_on` text,
	`id` text PRIMARY KEY,
	`list` text NOT NULL,
	`minutes` integer,
	`notes` text DEFAULT '' NOT NULL,
	`project_id` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`starred` integer DEFAULT false NOT NULL,
	`start_on` text,
	`title` text NOT NULL,
	`waiting_on` text,
	CONSTRAINT `fk_tasks_context_id_contexts_id_fk` FOREIGN KEY (`context_id`) REFERENCES `contexts`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_tasks_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `events_by_start` ON `events` (`start`);--> statement-breakpoint
CREATE INDEX `tasks_by_list` ON `tasks` (`list`,`completed_at`);--> statement-breakpoint
CREATE INDEX `tasks_by_project` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_by_block` ON `tasks` (`block_start`);