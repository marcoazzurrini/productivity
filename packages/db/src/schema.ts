import type {
  CalendarEventKind,
  CaptureSource,
  Energy,
  LocalDate,
  LocalDateTime,
  ProjectStatus,
  TagColor,
  TaskList,
} from "@productivity/gtd";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const events = sqliteTable(
  "events",
  {
    allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
    end: text("end_at").$type<LocalDateTime>().notNull(),
    id: text("id").primaryKey(),
    kind: text("kind").$type<CalendarEventKind>().notNull(),
    start: text("start").$type<LocalDateTime>().notNull(),
    title: text("title").notNull(),
  },
  (table) => [index("events_by_start").on(table.start)]
);

export const reviewSteps = sqliteTable("review_steps", {
  stepId: text("step_id").primaryKey(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
