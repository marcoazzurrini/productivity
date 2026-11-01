import type { ClarifyOutcome, LocalDate, TaskChanges } from "@productivity/gtd";

/** A value that survives JSON: what models send and structured answers hold. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** What the user has open in the middle pane when they send a message. */
export type ViewContext =
  | { view: "journal"; day: LocalDate }
  | { view: "inbox" }
  | { view: "next-actions" }
  | { view: "upcoming" }
  | { view: "waiting" }
  | { view: "someday" }
  | { view: "project"; projectId: string }
  | { view: "review" };

export type MessageRole = "user" | "assistant" | "event";

/** A part of a message, as the database keeps it. */
export type StoredBlock =
  | { kind: "text"; text: string }
  | { kind: "tool"; label: string }
  | { kind: "proposal"; proposalId: string }
  | { kind: "change"; changeId: string }
  | { kind: "error"; text: string };

export interface StoredMessage {
  id: string;
  /** Orders the conversation. Starts at 1 and never repeats. */
  seq: number;
  role: MessageRole;
  blocks: StoredBlock[];
  /** An ISO instant, such as `2026-10-24T09:30:00.000Z`. */
  createdAt: string;
}

/** A part of a message, with the proposal or change it points to filled in. */
export type AgentBlock =
  | { kind: "text"; text: string }
  | { kind: "tool"; label: string }
  | { kind: "proposal"; proposal: Proposal }
  | { kind: "change"; change: Change }
  | { kind: "error"; text: string };

export interface AgentMessage {
  id: string;
  seq: number;
  role: MessageRole;
  blocks: AgentBlock[];
  createdAt: string;
}

/** One changed stretch of a journal page, for showing the edit. */
export interface LineChange {
  /** The first changed line of the page before the edit, from 1. */
  line: number;
  removed: string[];
  added: string[];
}

/** One Inbox item and where the agent suggests it goes. */
export interface FilingItem {
  taskId: string;
  title: string;
  outcome: ClarifyOutcome;
  /** Where it goes, in words: "Next Actions · @Calls". */
  destination: string;
  /** Why, in a few words. */
  reason: string;
}

/** A change the agent suggests. Nothing happens until the user applies it. */
export type ProposalAction =
  | {
      kind: "edit-journal";
      day: LocalDate;
      /** The whole page the edit was made against. */
      before: string;
      after: string;
      changes: LineChange[];
    }
  | { kind: "file-inbox"; items: FilingItem[] }
  | {
      kind: "update-task";
      taskId: string;
      title: string;
      changes: TaskChanges;
      /** The changes in words: "Context: @Calls". */
      details: string[];
    }
  | { kind: "delete-task"; taskId: string; title: string };

export type ProposalStatus = "pending" | "applied" | "discarded" | "stale";

export interface Proposal {
  id: string;
  /** One line: "Turn the Wins bullets into checkboxes". */
  summary: string;
  action: ProposalAction;
  status: ProposalStatus;
  createdAt: string;
  decidedAt: string | null;
}

/** How to take back a change the agent made or the user applied. */
export type ChangeUndo =
  | { kind: "delete-task"; taskId: string }
  | { kind: "set-completed"; taskId: string; completed: boolean }
  | { kind: "write-journal"; day: LocalDate; markdown: string }
  | { kind: "delete-note"; noteId: string }
  | { kind: "restore-note"; note: AgentNote }
  | { kind: "set-note-done"; noteId: string; doneAt: string | null };

/** A change already made, which the user can undo. */
export interface Change {
  id: string;
  /** "Added to Inbox: Call the dentist". */
  summary: string;
  undo: ChangeUndo;
  createdAt: string;
  undoneAt: string | null;
}

/**
 * Something the agent keeps between conversations: a lasting fact about the
 * user ("memory"), or a thing it started and has not finished ("loop").
 */
export interface AgentNote {
  id: string;
  kind: "memory" | "loop";
  text: string;
  createdAt: string;
  /** When an open loop was closed. Always null for memory. */
  doneAt: string | null;
}

/** Whether the agent can run, and as whom. */
export type AgentStatus =
  | { state: "ready"; email: string | null; plan: string | null }
  | { state: "missing"; detail: string }
  | { state: "signed-out" }
  | { state: "error"; detail: string };

/** What the agent tells the app while it works. */
export type AgentEvent =
  /** A message was added or changed. */
  | { type: "message"; message: AgentMessage }
  /** More text for the message being written. */
  | { type: "delta"; messageId: string; text: string }
  | { type: "running"; running: boolean }
  /** Proposals, changes or notes changed: refetch the conversation. */
  | { type: "thread-changed" }
  /** The agent changed tasks or journal pages. */
  | { type: "data-changed"; journalDays: LocalDate[] }
  /** The conversation was cleared. */
  | { type: "cleared" };

export interface InlineEditRequest {
  day: LocalDate;
  /** The whole page, so the model sees the text around the selection. */
  markdown: string;
  /** The selected range, as character offsets into `markdown`. */
  from: number;
  to: number;
  instruction: string;
}
