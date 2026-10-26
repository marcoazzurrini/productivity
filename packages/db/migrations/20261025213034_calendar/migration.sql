CREATE TABLE `calendar_events` (
	`all_day` integer DEFAULT false NOT NULL,
	`calendar_id` text NOT NULL,
	`editable` integer DEFAULT true NOT NULL,
	`end_at` text NOT NULL,
	`etag` text,
	`id` text PRIMARY KEY,
	`pending` text,
	`recurring` integer DEFAULT false NOT NULL,
	`remote_id` text,
	`start_at` text NOT NULL,
	`title` text NOT NULL,
	CONSTRAINT `fk_calendar_events_calendar_id_calendars_id_fk` FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `calendars` (
	`color` text NOT NULL,
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`remote_id` text,
	`source` text NOT NULL,
	`sync_token` text,
	`writable` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS `events_by_start`;--> statement-breakpoint
CREATE INDEX `calendar_events_by_start` ON `calendar_events` (`start_at`);--> statement-breakpoint
CREATE INDEX `calendar_events_by_pending` ON `calendar_events` (`pending`);--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_events_by_remote_id` ON `calendar_events` (`calendar_id`,`remote_id`);--> statement-breakpoint
-- Hand-written: the built-in local calendar (matches localCalendar in
-- @productivity/calendar), and the old events moved onto it. Timed events
-- become UTC instants; all-day events get an exclusive end day.
INSERT INTO `calendars` (`id`, `name`, `color`, `position`, `is_primary`, `remote_id`, `source`, `sync_token`, `writable`)
VALUES ('local', 'On this Mac', '#0070E0', 0, 0, NULL, 'local', NULL, 1);--> statement-breakpoint
INSERT INTO `calendar_events` (`id`, `calendar_id`, `title`, `all_day`, `start_at`, `end_at`, `editable`, `recurring`)
SELECT
	`id`,
	'local',
	`title`,
	`all_day`,
	CASE WHEN `all_day` THEN substr(`start`, 1, 10) ELSE strftime('%Y-%m-%dT%H:%M:%fZ', `start`, 'utc') END,
	CASE WHEN `all_day` THEN date(substr(`end_at`, 1, 10), '+1 day') ELSE strftime('%Y-%m-%dT%H:%M:%fZ', `end_at`, 'utc') END,
	1,
	0
FROM `events`;--> statement-breakpoint
DROP TABLE `events`;