import type { SQLOutputValue } from "node:sqlite";

import type {
  CalendarEvent,
  CalendarEventKind,
  CaptureSource,
  Context,
  Energy,
  Project,
  ProjectStatus,
  TagColor,
  Task,
  TaskList,
} from "@productivity/gtd";

/** A result row as node:sqlite returns it: column name to value. */
export type Row = Record<string, SQLOutputValue>;

export class CorruptRowError extends Error {
  constructor(column: string, expected: string) {
    super(`Column "${column}" does not hold ${expected}.`);
    this.name = "CorruptRowError";
  }
}

const isText = (value: SQLOutputValue | undefined): value is string =>
  typeof value === "string";

const isInteger = (value: SQLOutputValue | undefined): value is number =>
  typeof value === "number" && Number.isInteger(value);

const text = (row: Row, column: string): string => {
  const value = row[column];

  if (!isText(value)) {
    throw new CorruptRowError(column, "text");
  }

  return value;
};

const optionalText = (row: Row, column: string): string | null =>
  row[column] === null ? null : text(row, column);

const optionalInteger = (row: Row, column: string): number | null => {
  const value = row[column];

  if (value === null || value === undefined) {
    return null;
  }

  if (!isInteger(value)) {
    throw new CorruptRowError(column, "an integer");
  }

  return value;
};

const flag = (row: Row, column: string): boolean =>
  optionalInteger(row, column) === 1;

const oneOf =
  <Value extends string>(allowed: readonly Value[], label: string) =>
  (row: Row, column: string): Value => {
    const value = text(row, column);
    const match = allowed.find((candidate) => candidate === value);

    if (match === undefined) {
      throw new CorruptRowError(column, label);
    }

    return match;
  };

const taskList = oneOf<TaskList>(
  ["inbox", "next", "waiting", "someday", "reference"],
  "a task list"
);

const captureSource = oneOf<CaptureSource>(
  ["manual", "mail", "voice", "web", "chat"],
  "a capture source"
);

const energy = oneOf<Energy>(["low", "medium", "high"], "an energy level");

const tagColor = oneOf<TagColor>(
  [
    "gray",
    "brown",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "red",
  ],
  "a tag color"
);

const projectStatus = oneOf<ProjectStatus>(
  ["active", "someday", "done"],
  "a project status"
);

const eventKind = oneOf<CalendarEventKind>(
  ["meeting", "focus", "personal"],
  "an event kind"
);

export const toTask = (row: Row): Task => {
  const blockStart = optionalText(row, "block_start");
  const blockEnd = optionalText(row, "block_end");

  return {
    block:
      blockStart === null || blockEnd === null
        ? null
        : { end: blockEnd, start: blockStart },
    capturedAt: text(row, "captured_at"),
    completedAt: optionalText(row, "completed_at"),
    contextId: optionalText(row, "context_id"),
    deadline: optionalText(row, "deadline"),
    energy: row.energy === null ? null : energy(row, "energy"),
    followUpOn: optionalText(row, "follow_up_on"),
    id: text(row, "id"),
    list: taskList(row, "list"),
    minutes: optionalInteger(row, "minutes"),
    notes: text(row, "notes"),
    projectId: optionalText(row, "project_id"),
    source: captureSource(row, "source"),
    starred: flag(row, "starred"),
    startOn: optionalText(row, "start_on"),
    title: text(row, "title"),
    waitingOn: optionalText(row, "waiting_on"),
  };
};

export const toContext = (row: Row): Context => ({
  color: tagColor(row, "color"),
  id: text(row, "id"),
  name: text(row, "name"),
});

export const toProject = (row: Row): Project => ({
  areaId: optionalText(row, "area_id"),
  deadline: optionalText(row, "deadline"),
  id: text(row, "id"),
  name: text(row, "name"),
  outcome: text(row, "outcome"),
  status: projectStatus(row, "status"),
});

export const toEvent = (row: Row): CalendarEvent => ({
  allDay: flag(row, "all_day"),
  end: text(row, "end_at"),
  id: text(row, "id"),
  kind: eventKind(row, "kind"),
  start: text(row, "start"),
  title: text(row, "title"),
});

export const count = (row: Row | undefined): number =>
  row === undefined ? 0 : (optionalInteger(row, "count") ?? 0);

export const readText = text;
