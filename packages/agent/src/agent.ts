import { toLocalDate } from "@productivity/gtd";
import type { GtdStore, LocalDate } from "@productivity/gtd";
import { z } from "zod";

import { describeView, shortDay } from "./describe.ts";
import type { JournalAccess } from "./describe.ts";
import type {
  AgentBlock,
  AgentEvent,
  AgentMessage,
  AgentNote,
  AgentStatus,
  Change,
  InlineEditRequest,
  Proposal,
  StoredBlock,
  StoredMessage,
  ViewContext,
} from "./model.ts";
import {
  inlineEditPrompt,
  inlineEditSystem,
  seedText,
  summaryPrompt,
  summarySystem,
  systemPrompt,
  turnPrompt,
} from "./prompt.ts";
import type { AgentRepository } from "./repository.ts";
import type { AgentRuntime, ToolInput } from "./runtime.ts";
import { createTools } from "./tools.ts";

export interface AgentOptions {
  runtime: AgentRuntime;
  repository: AgentRepository;
  gtd: GtdStore;
  journal: JournalAccess;
  /** Defaults to the system clock. Tests pass a fixed one. */
  clock?: () => Date;
  newId?: () => string;
  /** The model for ⌘K edits: a fast one. */
  inlineModel?: string;
  /** Reports errors the agent recovers from, such as a failed summary. */
  onError?: (error: Error) => void;
}

/** The one agent of the app: its conversation, changes and memory. */
export interface Agent {
  /** Adds the user's message and starts a turn, or queues it behind one. */
  send: (text: string, view: ViewContext | null) => void;
  /** Stops the turn being written and drops queued messages. */
  stop: () => void;
  isRunning: () => boolean;
  /** Up to 60 visible messages before `beforeSeq`, or the newest. */
  history: (beforeSeq?: number) => AgentMessage[];
  decide: (proposalId: string, decision: "apply" | "discard") => void;
  undo: (changeId: string) => void;
  notes: () => AgentNote[];
  deleteNote: (noteId: string) => void;
  /** Hides the conversation and starts a new session. Memory stays. */
  clear: () => void;
  status: () => Promise<AgentStatus>;
  /** Rewrites part of a journal page for ⌘K. Returns the new text. */
  inlineEdit: (request: InlineEditRequest) => Promise<string>;
  /** Notes in the conversation that the user accepted a ⌘K edit. */
  recordInlineEdit: (day: LocalDate, instruction: string) => void;
  subscribe: (listener: (event: AgentEvent) => void) => () => void;
  /** Resolves once no turn is running or queued. */
  idle: () => Promise<void>;
}

/** The methods the app's other process may call, for IPC. */
export const agentMethods = [
  "send",
  "stop",
  "isRunning",
  "history",
  "decide",
  "undo",
  "notes",
  "deleteNote",
  "clear",
  "status",
  "inlineEdit",
  "recordInlineEdit",
] as const satisfies readonly (keyof Agent)[];

export type AgentMethod = (typeof agentMethods)[number];

export const isAgentMethod = (name: string): name is AgentMethod =>
  // SAFETY: widening the list to strings only lets `includes` take any name.
  (agentMethods as readonly string[]).includes(name);

export class AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentError";
  }
}

const pageSize = 60;

/** Recent messages carried into a new session. */
const seedMessages = 20;

/** Unsummarised messages that start a summary, and how many it folds. */
const summarizeAfter = 100;
const summaryBatch = 50;

const inlineSchema = z.object({ replacement: z.string() });
const summarySchema = z.object({ summary: z.string() });

interface Turn {
  text: string;
  view: ViewContext | null;
  /** The user message's place in the conversation. */
  seq: number;
}

/** The reply being written: one assistant message, filled in as it streams. */
interface Reply {
  push: (block: StoredBlock) => void;
}

export const createAgent = (options: AgentOptions): Agent => {
  const { runtime, repository, gtd, journal } = options;
  const clock = options.clock ?? (() => new Date());
  const newId = options.newId ?? (() => crypto.randomUUID());
  const now = (): string => clock().toISOString();
  const today = (): LocalDate => toLocalDate(clock());
  const listeners = new Set<(event: AgentEvent) => void>();

  const emit = (event: AgentEvent): void => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  const report = (error: Error): void => {
    options.onError?.(error);
  };

  const resolveBlock = (block: StoredBlock): AgentBlock[] => {
    switch (block.kind) {
      case "proposal": {
        const proposal = repository.getProposal(block.proposalId);

        return proposal === null ? [] : [{ kind: "proposal", proposal }];
      }

      case "change": {
        const change = repository.getChange(block.changeId);

        return change === null ? [] : [{ change, kind: "change" }];
      }

      default: {
        return [block];
      }
    }
  };

  const resolve = (message: StoredMessage): AgentMessage => ({
    ...message,
    blocks: message.blocks.flatMap(resolveBlock),
  });

  const emitMessage = (message: StoredMessage): void => {
    // A copy: the text block being streamed into keeps changing.
    emit({ message: structuredClone(resolve(message)), type: "message" });
  };

  const addEvent = (blocks: StoredBlock[]): void => {
    emitMessage(
      repository.appendMessage({ blocks, createdAt: now(), role: "event" })
    );
  };

  let reply: Reply | null = null;

  const tools = createTools({
    addBlock: (block) => {
      reply?.push(block);
    },
    dataChanged: (journalDays) => {
      emit({ journalDays, type: "data-changed" });
    },
    gtd,
    journal,
    newId,
    now,
    repository,
    today,
  });

  const toolLabel = (name: string, input: ToolInput): string => {
    const tool = tools.find((each) => each.name === name);

    try {
      return tool?.label(input) ?? `Used ${name}`;
    } catch {
      // The model sent input the tool refuses; the tool reports that itself.
      return `Used ${name}`;
    }
  };

  const queue: Turn[] = [];
  let controller: AbortController | null = null;
  let pump: Promise<void> | null = null;
  let summarizing = false;

  /** Folds old messages into the summary that seeds a new session. */
  const summarize = async (): Promise<void> => {
    const summarySeq = Number(repository.getState("summary-seq") ?? 0);
    const unsummarized = repository.messagesAfter(summarySeq);

    if (summarizing || unsummarized.length < summarizeAfter) {
      return;
    }

    summarizing = true;

    try {
      const batch = unsummarized.slice(0, summaryBatch);
      const last = batch.at(-1);

      const answer = summarySchema.parse(
        await runtime.complete({
          prompt: summaryPrompt(repository.getState("summary"), batch),
          schema: z.toJSONSchema(summarySchema),
          system: summarySystem,
        })
      );

      if (last !== undefined) {
        repository.setState("summary", answer.summary);
        repository.setState("summary-seq", String(last.seq));
      }
    } catch (error) {
      report(error instanceof Error ? error : new Error(String(error)));
    } finally {
      summarizing = false;
    }
  };

  const runTurn = async (turn: Turn, signal: AbortSignal): Promise<void> => {
    let message: StoredMessage | null = null;
    /** The newest message of this turn: the reply once it starts. */
    let lastSeq = turn.seq;
    const blocks: StoredBlock[] = [];
    /** The text block being streamed into, if one is open. */
    let streaming: { kind: "text"; text: string } | null = null;

    const save = (): StoredMessage => {
      message ??= repository.appendMessage({
        blocks: [],
        createdAt: now(),
        role: "assistant",
      });
      repository.updateMessage(message.id, blocks);
      message = { ...message, blocks: [...blocks] };
      lastSeq = message.seq;
      emitMessage(message);

      return message;
    };

    const push = (block: StoredBlock): void => {
      streaming = null;
      blocks.push(block);
      save();
    };

    reply = { push };

    // Continue the saved session, or start one.
    const savedSession = repository.getState("session-id");
    let sessionId = savedSession ?? newId();

    let resume =
      savedSession !== null && repository.getState("session-started") === "1";

    if (savedSession === null) {
      repository.setState("session-id", sessionId);
    }

    const seenSeq = Number(repository.getState("seen-seq") ?? 0);

    const news = repository
      .messagesAfter(seenSeq)
      .filter((each) => each.role === "event" && each.seq < turn.seq);

    let view: string | null = null;

    if (turn.view !== null) {
      try {
        view = describeView(turn.view, gtd, journal);
      } catch (error) {
        report(error instanceof Error ? error : new Error(String(error)));
      }
    }

    const attempt = async (): Promise<"done" | "session-missing"> => {
      const seed = resume
        ? null
        : seedText(
            repository.getState("summary"),
            repository.listMessages({
              beforeSeq: turn.seq,
              limit: seedMessages,
            })
          );

      const events = runtime.run({
        prompt: turnPrompt({ news, seed, text: turn.text, view }),
        resume,
        sessionId,
        signal,
        system: systemPrompt(today(), repository.listNotes()),
        tools,
      });

      for await (const event of events) {
        // Stopped, or the conversation was cleared: write nothing more.
        if (signal.aborted) {
          return "done";
        }

        switch (event.type) {
          case "text-delta": {
            if (streaming === null) {
              streaming = { kind: "text", text: "" };
              blocks.push(streaming);
              save();
            }

            streaming.text += event.text;

            if (message !== null) {
              emit({ messageId: message.id, text: event.text, type: "delta" });
            }

            break;
          }

          case "text": {
            if (streaming === null) {
              push({ kind: "text", text: event.text });
            } else {
              streaming.text = event.text;
              streaming = null;
              save();
            }

            break;
          }

          case "tool": {
            push({ kind: "tool", label: toolLabel(event.name, event.input) });
            break;
          }

          case "failed": {
            if (event.sessionMissing && resume) {
              return "session-missing";
            }

            if (!signal.aborted) {
              push({ kind: "error", text: event.message });
            }

            return "done";
          }

          default: {
            return "done";
          }
        }
      }

      return "done";
    };

    try {
      if ((await attempt()) === "session-missing") {
        // The session is gone, say after Claude Code cleaned up old
        // transcripts: start a new one, seeded with the conversation.
        sessionId = newId();
        repository.setState("session-id", sessionId);
        resume = false;
        await attempt();
      }
    } catch (error) {
      if (!signal.aborted) {
        push({
          kind: "error",
          text: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      reply = null;
    }

    repository.setState("session-started", "1");
    repository.setState("seen-seq", String(lastSeq));
  };

  const drain = async (): Promise<void> => {
    emit({ running: true, type: "running" });

    for (let turn = queue.shift(); turn !== undefined; turn = queue.shift()) {
      controller = new AbortController();
      // Turns run one at a time, so each waits for the one before.
      // oxlint-disable-next-line no-await-in-loop
      await runTurn(turn, controller.signal);
      controller = null;
    }

    emit({ running: false, type: "running" });
    void summarize();
  };

  const start = (): void => {
    pump ??= drain().finally(() => {
      pump = null;
    });
  };

  const findNote = (noteId: string): AgentNote | undefined =>
    repository.listNotes().find((note) => note.id === noteId);

  const saveChange = (summary: string, undo: Change["undo"]): Change => {
    const change: Change = {
      createdAt: now(),
      id: newId(),
      summary,
      undo,
      undoneAt: null,
    };

    repository.saveChange(change);

    return change;
  };

  /** Applies a proposal. Returns what to tell the conversation. */
  const apply = (
    proposal: Proposal
  ): { blocks: StoredBlock[]; days: LocalDate[] } | "stale" => {
    const { action } = proposal;

    switch (action.kind) {
      case "edit-journal": {
        if (journal.read(action.day).markdown !== action.before) {
          return "stale";
        }

        journal.write(action.day, action.after);

        const change = saveChange(
          `Edited the journal for ${shortDay(action.day)}`,
          {
            day: action.day,
            kind: "write-journal",
            markdown: action.before,
          }
        );

        return {
          blocks: [
            { kind: "text", text: `Applied: ${proposal.summary}` },
            { changeId: change.id, kind: "change" },
          ],
          days: [action.day],
        };
      }

      case "file-inbox": {
        const inbox = new Set(gtd.listInbox().map((task) => task.id));
        const ready = action.items.filter((item) => inbox.has(item.taskId));

        if (ready.length === 0) {
          return "stale";
        }

        for (const item of ready) {
          gtd.clarify(item.taskId, item.outcome);
        }

        const gone = action.items.length - ready.length;

        return {
          blocks: [
            {
              kind: "text",
              text: `Applied: filed ${ready.length} Inbox ${ready.length === 1 ? "item" : "items"}${
                gone === 0 ? "" : `; ${gone} had already left the Inbox`
              }.`,
            },
          ],
          days: [],
        };
      }

      case "update-task": {
        gtd.updateTask(action.taskId, action.changes);

        return {
          blocks: [{ kind: "text", text: `Applied: ${proposal.summary}` }],
          days: [],
        };
      }

      default: {
        gtd.deleteTask(action.taskId);

        return {
          blocks: [
            { kind: "text", text: `Applied: deleted "${action.title}"` },
          ],
          days: [],
        };
      }
    }
  };

  return {
    clear: () => {
      queue.length = 0;
      controller?.abort();
      repository.hideMessages();

      for (const key of [
        "session-id",
        "session-started",
        "seen-seq",
        "summary",
        "summary-seq",
      ] as const) {
        repository.setState(key, null);
      }

      emit({ type: "cleared" });
    },

    decide: (proposalId, decision) => {
      const proposal = repository.getProposal(proposalId);

      if (proposal === null) {
        throw new AgentError("That proposal no longer exists.");
      }

      if (proposal.status !== "pending") {
        return;
      }

      const decided = (status: Proposal["status"]): void => {
        repository.saveProposal({ ...proposal, decidedAt: now(), status });
        emit({ type: "thread-changed" });
      };

      if (decision === "discard") {
        decided("discarded");
        addEvent([{ kind: "text", text: `Discarded: ${proposal.summary}` }]);

        return;
      }

      let result: ReturnType<typeof apply>;

      try {
        result = apply(proposal);
      } catch (error) {
        report(error instanceof Error ? error : new Error(String(error)));
        result = "stale";
      }

      if (result === "stale") {
        decided("stale");

        return;
      }

      decided("applied");
      addEvent(result.blocks);
      emit({ journalDays: result.days, type: "data-changed" });
    },

    deleteNote: (noteId) => {
      repository.deleteNote(noteId);
      emit({ type: "thread-changed" });
    },

    history: (beforeSeq) =>
      repository.listMessages({ beforeSeq, limit: pageSize }).map(resolve),

    idle: () => pump ?? Promise.resolve(),

    inlineEdit: async ({ markdown, from, to, instruction }) => {
      if (
        !(
          Number.isInteger(from) &&
          Number.isInteger(to) &&
          from >= 0 &&
          from <= to &&
          to <= markdown.length
        )
      ) {
        throw new AgentError("The selection is not on the page.");
      }

      if (instruction.trim() === "") {
        throw new AgentError("Say what to change.");
      }

      const answer = await runtime.complete({
        model: options.inlineModel,
        prompt: inlineEditPrompt(markdown, from, to, instruction),
        schema: z.toJSONSchema(inlineSchema),
        system: inlineEditSystem,
      });

      return inlineSchema.parse(answer).replacement;
    },

    isRunning: () => pump !== null,

    notes: () => repository.listNotes(),

    recordInlineEdit: (day, instruction) => {
      addEvent([
        {
          kind: "text",
          text: `Edited the journal for ${shortDay(day)} with ⌘K: “${instruction}”`,
        },
      ]);
    },

    send: (text, view) => {
      const trimmed = text.trim();

      if (trimmed === "") {
        throw new AgentError("Write a message first.");
      }

      const message = repository.appendMessage({
        blocks: [{ kind: "text", text: trimmed }],
        createdAt: now(),
        role: "user",
      });

      emitMessage(message);
      queue.push({ seq: message.seq, text: trimmed, view });
      start();
    },

    status: () => runtime.status(),

    stop: () => {
      queue.length = 0;
      controller?.abort();
    },

    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    undo: (changeId) => {
      const change = repository.getChange(changeId);

      if (change === null || change.undoneAt !== null) {
        return;
      }

      const { undo } = change;
      const days: LocalDate[] = [];

      switch (undo.kind) {
        case "delete-task": {
          gtd.deleteTask(undo.taskId);
          break;
        }

        case "set-completed": {
          gtd.setCompleted(undo.taskId, undo.completed);
          break;
        }

        case "write-journal": {
          journal.write(undo.day, undo.markdown);
          days.push(undo.day);
          break;
        }

        case "delete-note": {
          repository.deleteNote(undo.noteId);
          break;
        }

        case "restore-note": {
          repository.saveNote(undo.note);
          break;
        }

        default: {
          const note = findNote(undo.noteId);

          if (note !== undefined) {
            repository.saveNote({ ...note, doneAt: undo.doneAt });
          }
        }
      }

      repository.saveChange({ ...change, undoneAt: now() });
      emit({ type: "thread-changed" });
      addEvent([{ kind: "text", text: `Undid: ${change.summary}` }]);
      emit({ journalDays: days, type: "data-changed" });
    },
  };
};
