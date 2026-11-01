import type {
  AgentNote,
  Change,
  MessageRole,
  Proposal,
  StoredBlock,
  StoredMessage,
} from "./model.ts";

/** Keys the agent keeps in its key-value state. */
export type AgentStateKey =
  /** The Claude Code session the conversation continues. */
  | "session-id"
  /** "1" once the session has run a turn, so the next turn resumes it. */
  | "session-started"
  /** The last message the model has seen. Later event messages are news to it. */
  | "seen-seq"
  /** A summary of the conversation up to `summary-seq`. */
  | "summary"
  | "summary-seq";

/**
 * Where the agent keeps its conversation, proposals, changes and notes.
 * The db package implements it on SQLite; tests use an in-memory one.
 */
export interface AgentRepository {
  appendMessage: (input: {
    role: MessageRole;
    blocks: StoredBlock[];
    createdAt: string;
  }) => StoredMessage;
  updateMessage: (id: string, blocks: StoredBlock[]) => void;
  /** Visible messages before `beforeSeq` (or the newest), oldest first. */
  listMessages: (options: {
    beforeSeq?: number;
    limit: number;
  }) => StoredMessage[];
  /** Visible messages after `seq`, oldest first. */
  messagesAfter: (seq: number) => StoredMessage[];
  /** Clear conversation: hides every message so far. */
  hideMessages: () => void;

  getState: (key: AgentStateKey) => string | null;
  setState: (key: AgentStateKey, value: string | null) => void;

  saveProposal: (proposal: Proposal) => void;
  getProposal: (id: string) => Proposal | null;

  saveChange: (change: Change) => void;
  getChange: (id: string) => Change | null;

  listNotes: () => AgentNote[];
  saveNote: (note: AgentNote) => void;
  deleteNote: (id: string) => void;
}
