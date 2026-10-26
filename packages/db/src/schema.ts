import type { CalendarSource, PendingChange } from "@productivity/calendar";
import type {
  CaptureSource,
  Energy,
  LocalDate,
  LocalDateTime,
  ProjectStatus,
  TagColor,
  TaskList,
} from "@productivity/gtd";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * The database schema. After changing it, run `bun run db:generate` to write
 * the SQL migration that brings existing databases up to date.
 */

export const contexts = sqliteTable("contexts", {
  color: text("color").$type<TagColor>().notNull(),
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
});

export const areas = sqliteTable("areas", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
});

export const projects = sqliteTable("projects", {
  areaId: text("area_id").references(() => areas.id, { onDelete: "set null" }),
  createdAt: text("created_at").$type<LocalDateTime>().notNull(),
  deadline: text("deadline").$type<LocalDate>(),
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  outcome: text("outcome").notNull().default(""),
  status: text("status").$type<ProjectStatus>().notNull().default("active"),
});

export const tasks = sqliteTable(
  "tasks",
  {
    blockEnd: text("block_end").$type<LocalDateTime>(),
    blockStart: text("block_start").$type<LocalDateTime>(),
    capturedAt: text("captured_at").$type<LocalDateTime>().notNull(),
    completedAt: text("completed_at").$type<LocalDateTime>(),
    contextId: text("context_id").references(() => contexts.id, {
      onDelete: "set null",
    }),
    deadline: text("deadline").$type<LocalDate>(),
    energy: text("energy").$type<Energy>(),
    followUpOn: text("follow_up_on").$type<LocalDate>(),
    id: text("id").primaryKey(),
    list: text("list").$type<TaskList>().notNull(),
    minutes: integer("minutes"),
    notes: text("notes").notNull().default(""),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    source: text("source").$type<CaptureSource>().notNull().default("manual"),
    starred: integer("starred", { mode: "boolean" }).notNull().default(false),
    startOn: text("start_on").$type<LocalDate>(),
    title: text("title").notNull(),
    waitingOn: text("waiting_on"),
  },
  (table) => [
    index("tasks_by_list").on(table.list, table.completedAt),
    index("tasks_by_project").on(table.projectId),
    index("tasks_by_block").on(table.blockStart),
  ]
);

/** The local calendar and the user's Google calendars. */
export const calendars = sqliteTable("calendars", {
  color: text("color").notNull(),
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  primary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  remoteId: text("remote_id"),
  source: text("source").$type<CalendarSource>().notNull(),
  syncToken: text("sync_token"),
  writable: integer("writable", { mode: "boolean" }).notNull().default(true),
});

/**
 * Timed events store UTC instants (`2026-10-25T09:00:00.000Z`), all-day
 * events days (`2026-10-25`). Either way the end is exclusive.
 */
export const calendarEvents = sqliteTable(
  "calendar_events",
  {
    allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
    calendarId: text("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    editable: integer("editable", { mode: "boolean" }).notNull().default(true),
    end: text("end_at").notNull(),
    etag: text("etag"),
    id: text("id").primaryKey(),
    pending: text("pending").$type<PendingChange>(),
    recurring: integer("recurring", { mode: "boolean" })
      .notNull()
      .default(false),
    remoteId: text("remote_id"),
    start: text("start_at").notNull(),
    title: text("title").notNull(),
  },
  (table) => [
    index("calendar_events_by_start").on(table.start),
    index("calendar_events_by_pending").on(table.pending),
    uniqueIndex("calendar_events_by_remote_id").on(
      table.calendarId,
      table.remoteId
    ),
  ]
);

export const reviewSteps = sqliteTable("review_steps", {
  stepId: text("step_id").primaryKey(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** One journal page per day. Days with nothing written have no row. */
export const journalPages = sqliteTable("journal_pages", {
  day: text("day").$type<LocalDate>().primaryKey(),
  markdown: text("markdown").notNull(),
  updatedAt: text("updated_at").$type<LocalDateTime>().notNull(),
});
