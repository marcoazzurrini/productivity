CREATE TABLE `agent_changes` (
	`change` text NOT NULL,
	`id` text PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE `agent_messages` (
	`blocks` text NOT NULL,
	`created_at` text NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`id` text PRIMARY KEY,
	`role` text NOT NULL,
	`seq` integer NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE `agent_notes` (
	`created_at` text NOT NULL,
	`done_at` text,
	`id` text PRIMARY KEY,
	`kind` text NOT NULL,
	`text` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_proposals` (
	`id` text PRIMARY KEY,
	`proposal` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_state` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL
);
