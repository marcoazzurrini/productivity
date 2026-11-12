CREATE TABLE `headings` (
	`id` text PRIMARY KEY,
	`position` integer NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	CONSTRAINT `fk_headings_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `heading_id` text REFERENCES headings(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `headings_by_project` ON `headings` (`project_id`);