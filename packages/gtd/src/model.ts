import type { LocalDate, LocalDateTime } from "./dates.ts";

export type Energy = "low" | "medium" | "high";

export type TagColor =
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

/**
 * Where a task lives in the GTD system.
 *
 * - `inbox`: captured, not clarified yet.
 * - `next`: a concrete action the user will do.
 * - `waiting`: an action someone else owns; the user follows up.
 * - `someday`: an idea parked until a Weekly Review revives it.
 * - `reference`: kept for information, never acted on.
 */
export type TaskList = "inbox" | "next" | "waiting" | "someday" | "reference";

export type CaptureSource = "manual" | "mail" | "voice" | "web" | "chat";

export interface TimeBlock {
  start: LocalDateTime;
  end: LocalDateTime;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  list: TaskList;
  source: CaptureSource;
  capturedAt: LocalDateTime;
  projectId: string | null;
  contextId: string | null;
  minutes: number | null;
  energy: Energy | null;
  /** Hidden from Next Actions until this day. Shown in Upcoming before then. */
  startOn: LocalDate | null;
  deadline: LocalDate | null;
  starred: boolean;
  /** Who the user is waiting on. Only set on `waiting` tasks. */
  waitingOn: string | null;
  followUpOn: LocalDate | null;
  block: TimeBlock | null;
  completedAt: LocalDateTime | null;
}

export interface Context {
  id: string;
  name: string;
  color: TagColor;
}

export interface Area {
  id: string;
  name: string;
}

export type ProjectStatus = "active" | "someday" | "done";

export interface Project {
  id: string;
  name: string;
  areaId: string | null;
  /** What "done" looks like, so the user knows when to stop. */
  outcome: string;
  deadline: LocalDate | null;
  status: ProjectStatus;
}
