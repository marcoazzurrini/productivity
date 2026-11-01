import { addDays } from "@productivity/gtd";
import type {
  ClarifyOutcome,
  GtdStore,
  LocalDate,
  ProjectAnswer,
  Task,
  TaskChanges,
} from "@productivity/gtd";
import { z } from "zod";

import {
  describeContexts,
  describeJournal,
  describeProject,
  describeProjects,
  describeTasks,
  longDay,
  lookupsOf,
  shortDay,
} from "./describe.ts";
import type { JournalAccess, Lookups } from "./describe.ts";
import { applyLineEdits } from "./journal-edits.ts";
import type {
  AgentNote,
  ChangeUndo,
  FilingItem,
  ProposalAction,
  StoredBlock,
} from "./model.ts";
import type { AgentRepository } from "./repository.ts";
import type { AgentTool, ToolFields } from "./runtime.ts";

/** What the tools reach: the data, and the reply being written. */
export interface ToolHost {
  gtd: GtdStore;
  journal: JournalAccess;
  repository: AgentRepository;
  /** The current instant, as an ISO string. */
  now: () => string;
  today: () => LocalDate;
  newId: () => string;
  /** Adds a block, such as a proposal card, to the reply being written. */
  addBlock: (block: StoredBlock) => void;
  /** Tells the app that tasks, or these journal pages, changed. */
  dataChanged: (journalDays: LocalDate[]) => void;
}

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

interface ToolSpec<Fields extends ToolFields> {
  name: string;
  description: string;
  input: Fields;
  readOnly: boolean;
  label: (input: z.infer<z.ZodObject<Fields>>) => string;
  run: (input: z.infer<z.ZodObject<Fields>>) => string | Promise<string>;
}

/** A tool that parses the model's input with its own schema first. */
const defineTool = <Fields extends ToolFields>(
  spec: ToolSpec<Fields>
): AgentTool => {
  const schema = z.object(spec.input);

  return {
    description: spec.description,
    input: spec.input,
    label: (input) => spec.label(schema.parse(input)),
    name: spec.name,
    readOnly: spec.readOnly,
    run: (input) => spec.run(schema.parse(input)),
  };
};

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .describe("A day as YYYY-MM-DD.");

const energy = z.enum(["low", "medium", "high"]);

/** Every task the store can list, to find one by id. */
const allTasks = (gtd: GtdStore): Task[] => [
  ...gtd.listInbox(),
  ...gtd.listNextActions(),
  ...gtd.listUpcoming(),
  ...gtd.listWaiting(),
  ...gtd.listSomeday(),
  ...gtd
    .listProjects()
    .flatMap((project) => gtd.getProject(project.id)?.tasks ?? []),
];

const findTask = (gtd: GtdStore, taskId: string): Task => {
  const task = allTasks(gtd).find((each) => each.id === taskId);

  if (task === undefined) {
    throw new ToolError(`There is no task with id ${taskId}.`);
  }

  return task;
};

const checkContext = (
  lookups: Lookups,
  contextId: string | null | undefined
) => {
  if (
    contextId !== null &&
    contextId !== undefined &&
    !lookups.contexts.has(contextId)
  ) {
    throw new ToolError(
      `There is no context with id ${contextId}. Call list_contexts.`
    );
  }
};

const checkProject = (
  lookups: Lookups,
  projectId: string | null | undefined
) => {
  if (
    projectId !== null &&
    projectId !== undefined &&
    !lookups.projects.has(projectId)
  ) {
    throw new ToolError(
      `There is no project with id ${projectId}. Call list_projects.`
    );
  }
};

const filingInput = z.object({
  context_id: z.string().optional().describe("For next: the context id."),
  deadline: day.optional(),
  destination: z
    .enum(["next", "waiting", "someday", "reference", "trash", "done"])
    .describe(
      "next: a next action. waiting: delegated. done: under two minutes, the user did it."
    ),
  energy: energy.optional(),
  follow_up_on: day.optional().describe("For waiting: when to chase."),
  minutes: z.number().int().positive().optional(),
  new_project: z
    .object({ name: z.string().min(1), outcome: z.string() })
    .optional()
    .describe("For next or waiting: start a new project for it."),
  next_action: z
    .string()
    .optional()
    .describe(
      "For next or waiting: the action, worded as a physical step. Defaults to the title."
    ),
  project_id: z
    .string()
    .optional()
    .describe("For next or waiting: an existing project id."),
  reason: z.string().describe("Why, in a few words."),
  start_on: day.optional(),
  task_id: z.string(),
  waiting_on: z
    .string()
    .optional()
    .describe("For waiting: who it is delegated to."),
});

type FilingInput = z.infer<typeof filingInput>;

const projectAnswer = (input: FilingInput): ProjectAnswer => {
  if (input.new_project !== undefined) {
    return {
      kind: "new",
      name: input.new_project.name,
      outcome: input.new_project.outcome,
    };
  }

  return input.project_id === undefined
    ? { kind: "none" }
    : { kind: "existing", projectId: input.project_id };
};

const projectWords = (
  project: ProjectAnswer,
  lookups: Lookups
): string | undefined => {
  if (project.kind === "existing") {
    return lookups.projects.get(project.projectId)?.name;
  }

  return project.kind === "new" ? `new project "${project.name}"` : undefined;
};

const disposalWords = {
  done: "Done (under two minutes)",
  reference: "Reference",
  someday: "Someday / Maybe",
  trash: "Trash",
} as const;

/** Where an action goes, in words: "Next Actions · @Calls · Q4 Planning". */
const actionWords = (
  input: FilingInput,
  project: ProjectAnswer,
  lookups: Lookups,
  followUpOn: LocalDate
): string => {
  const parts =
    input.destination === "waiting"
      ? [
          "Waiting For",
          input.waiting_on ?? "someone",
          `follow up ${shortDay(followUpOn)}`,
          projectWords(project, lookups),
        ]
      : [
          "Next Actions",
          input.context_id === undefined
            ? undefined
            : lookups.contexts.get(input.context_id)?.name,
          projectWords(project, lookups),
          input.deadline === undefined
            ? undefined
            : `due ${shortDay(input.deadline)}`,
        ];

  return parts.filter((part) => part !== undefined).join(" · ");
};

const filingItem = (
  input: FilingInput,
  task: Task,
  lookups: Lookups,
  today: LocalDate
): FilingItem => {
  checkContext(lookups, input.context_id);
  checkProject(lookups, input.project_id);

  const base = { reason: input.reason, taskId: task.id, title: task.title };

  if (input.destination !== "next" && input.destination !== "waiting") {
    return {
      ...base,
      destination: disposalWords[input.destination],
      outcome: { kind: input.destination },
    };
  }

  const project = projectAnswer(input);
  const followUpOn = input.follow_up_on ?? addDays(today, 7);

  const outcome: ClarifyOutcome = {
    kind: "action",
    owner:
      input.destination === "waiting"
        ? {
            followUpOn,
            kind: "delegate",
            person: input.waiting_on ?? "someone",
          }
        : { kind: "me" },
    project,
    title: input.next_action ?? task.title,
    when: {
      contextId: input.context_id ?? null,
      deadline: input.deadline ?? null,
      energy: input.energy ?? null,
      minutes: input.minutes ?? null,
      startOn: input.start_on ?? null,
    },
  };

  return {
    ...base,
    destination: actionWords(input, project, lookups, followUpOn),
    outcome,
  };
};

const taskChangesInput = z.object({
  context_id: z.string().nullable().optional(),
  deadline: day.nullable().optional(),
  energy: energy.nullable().optional(),
  follow_up_on: day.nullable().optional(),
  minutes: z.number().int().positive().nullable().optional(),
  notes: z.string().optional(),
  project_id: z.string().nullable().optional(),
  starred: z.boolean().optional(),
  start_on: day.nullable().optional(),
  title: z.string().min(1).optional(),
});

/** Task changes, and the same changes in words for the proposal card. */
interface DescribedChanges {
  changes: TaskChanges;
  details: string[];
}

/** "none" for a cleared field, otherwise its name or value. */
const shown = (value: string | number | null, name?: string): string =>
  value === null ? "none" : (name ?? String(value));

const toTaskChanges = (
  input: z.infer<typeof taskChangesInput>,
  lookups: Lookups
): DescribedChanges => {
  checkContext(lookups, input.context_id);
  checkProject(lookups, input.project_id);

  const changes: TaskChanges = {};
  const details: string[] = [];

  if (input.title !== undefined) {
    changes.title = input.title;
    details.push(`Title: ${input.title}`);
  }

  if (input.context_id !== undefined) {
    changes.contextId = input.context_id;
    details.push(
      `Context: ${shown(input.context_id, lookups.contexts.get(input.context_id ?? "")?.name)}`
    );
  }

  if (input.project_id !== undefined) {
    changes.projectId = input.project_id;
    details.push(
      `Project: ${shown(input.project_id, lookups.projects.get(input.project_id ?? "")?.name)}`
    );
  }

  if (input.minutes !== undefined) {
    changes.minutes = input.minutes;
    details.push(`Time: ${shown(input.minutes, `${input.minutes} min`)}`);
  }

  if (input.energy !== undefined) {
    changes.energy = input.energy;
    details.push(`Energy: ${shown(input.energy)}`);
  }

  if (input.start_on !== undefined) {
    changes.startOn = input.start_on;
    details.push(`Starts: ${shown(input.start_on)}`);
  }

  if (input.deadline !== undefined) {
    changes.deadline = input.deadline;
    details.push(`Due: ${shown(input.deadline)}`);
  }

  if (input.follow_up_on !== undefined) {
    changes.followUpOn = input.follow_up_on;
    details.push(`Follow up: ${shown(input.follow_up_on)}`);
  }

  if (input.starred !== undefined) {
    changes.starred = input.starred;
    details.push(input.starred ? "Starred" : "Not starred");
  }

  if (input.notes !== undefined) {
    changes.notes = input.notes;
    details.push("Notes changed");
  }

  if (details.length === 0) {
    throw new ToolError("Give at least one change.");
  }

  return { changes, details };
};

/** The tools the agent may call. Each wraps the GTD store or the journal. */
export const createTools = (host: ToolHost): AgentTool[] => {
  const { gtd, journal, repository } = host;

  const propose = (summary: string, action: ProposalAction): string => {
    const id = host.newId();

    repository.saveProposal({
      action,
      createdAt: host.now(),
      decidedAt: null,
      id,
      status: "pending",
      summary,
    });
    host.addBlock({ kind: "proposal", proposalId: id });

    return "Proposed. The user now sees a card and decides; nothing has changed yet.";
  };

  const changed = (summary: string, undo: ChangeUndo): string => {
    const id = host.newId();

    repository.saveChange({
      createdAt: host.now(),
      id,
      summary,
      undo,
      undoneAt: null,
    });
    host.addBlock({ changeId: id, kind: "change" });

    return `Done: ${summary}. The user can undo it.`;
  };

  const findNote = (id: string, kind: AgentNote["kind"]): AgentNote => {
    const note = repository
      .listNotes()
      .find((each) => each.id === id && each.kind === kind);

    if (note === undefined) {
      throw new ToolError(
        `There is no ${kind === "memory" ? "memory" : "open loop"} with id ${id}.`
      );
    }

    return note;
  };

  const listTool = (
    name: string,
    title: string,
    list: (store: GtdStore) => Task[]
  ): AgentTool =>
    defineTool({
      description: `List ${title}, with task ids.`,
      input: {},
      label: () => `Looked at ${title}`,
      name,
      readOnly: true,
      run: () => describeTasks(title, list(gtd), lookupsOf(gtd)),
    });

  return [
    defineTool({
      description:
        "Read the journal page for a day. Lines are numbered for propose_journal_edit.",
      input: { day },
      label: (input) => `Read the journal for ${shortDay(input.day)}`,
      name: "read_journal",
      readOnly: true,
      run: (input) =>
        describeJournal(input.day, journal.read(input.day).markdown),
    }),
    listTool("list_inbox", "the Inbox", (store) => store.listInbox()),
    listTool("list_next_actions", "Next Actions", (store) =>
      store.listNextActions()
    ),
    listTool("list_upcoming", "Upcoming", (store) => store.listUpcoming()),
    listTool("list_waiting", "Waiting For", (store) => store.listWaiting()),
    listTool("list_someday", "Someday / Maybe", (store) => store.listSomeday()),
    defineTool({
      description: "List the contexts (such as @Calls) with their ids.",
      input: {},
      label: () => "Looked at the contexts",
      name: "list_contexts",
      readOnly: true,
      run: () => describeContexts(lookupsOf(gtd)),
    }),
    defineTool({
      description: "List the projects with their ids and open task counts.",
      input: {},
      label: () => "Looked at the projects",
      name: "list_projects",
      readOnly: true,
      run: () => describeProjects(lookupsOf(gtd)),
    }),
    defineTool({
      description: "Read one project and its tasks.",
      input: { project_id: z.string() },
      label: (input) =>
        `Looked at ${lookupsOf(gtd).projects.get(input.project_id)?.name ?? "a project"}`,
      name: "get_project",
      readOnly: true,
      run: (input) => describeProject(gtd, input.project_id, lookupsOf(gtd)),
    }),
    defineTool({
      description:
        "List the tasks placed on the calendar in the week of a day. Calendar events are not included.",
      input: { day },
      label: (input) => `Looked at the week of ${shortDay(input.day)}`,
      name: "get_week",
      readOnly: true,
      run: (input) => {
        const week = gtd.getWeek(input.day);

        return describeTasks(
          `Tasks on the calendar, ${longDay(week.days[0] ?? input.day)} to ${longDay(week.days.at(-1) ?? input.day)}`,
          week.blocks,
          lookupsOf(gtd)
        );
      },
    }),

    defineTool({
      description: "Put a new item in the Inbox now. The user can undo it.",
      input: { notes: z.string().optional(), title: z.string().min(1) },
      label: (input) => `Added to the Inbox: ${input.title}`,
      name: "capture",
      readOnly: false,
      run: (input) => {
        const task = gtd.capture({
          notes: input.notes,
          source: "chat",
          title: input.title,
        });

        host.dataChanged([]);

        return changed(`Added to Inbox: ${task.title}`, {
          kind: "delete-task",
          taskId: task.id,
        });
      },
    }),
    defineTool({
      description: "Mark a task done. The user can undo it.",
      input: { task_id: z.string() },
      label: () => "Completed a task",
      name: "complete_task",
      readOnly: false,
      run: (input) => {
        const task = findTask(gtd, input.task_id);

        gtd.setCompleted(task.id, true);
        host.dataChanged([]);

        return changed(`Done: ${task.title}`, {
          completed: task.completedAt !== null,
          kind: "set-completed",
          taskId: task.id,
        });
      },
    }),
    defineTool({
      description:
        "Remember a lasting fact or preference about the user for future conversations. One fact per call.",
      input: { text: z.string().min(1) },
      label: () => "Saved to memory",
      name: "remember",
      readOnly: false,
      run: (input) => {
        const note: AgentNote = {
          createdAt: host.now(),
          doneAt: null,
          id: host.newId(),
          kind: "memory",
          text: input.text,
        };

        repository.saveNote(note);

        return changed(`Remembered: ${input.text}`, {
          kind: "delete-note",
          noteId: note.id,
        });
      },
    }),
    defineTool({
      description: "Forget something in memory that is wrong or out of date.",
      input: { memory_id: z.string() },
      label: () => "Removed from memory",
      name: "forget",
      readOnly: false,
      run: (input) => {
        const note = findNote(input.memory_id, "memory");

        repository.deleteNote(note.id);

        return changed(`Forgot: ${note.text}`, { kind: "restore-note", note });
      },
    }),
    defineTool({
      description:
        "Track something you started for the user and have not finished.",
      input: { text: z.string().min(1) },
      label: () => "Added an open loop",
      name: "add_open_loop",
      readOnly: false,
      run: (input) => {
        const note: AgentNote = {
          createdAt: host.now(),
          doneAt: null,
          id: host.newId(),
          kind: "loop",
          text: input.text,
        };

        repository.saveNote(note);

        return changed(`Open loop: ${input.text}`, {
          kind: "delete-note",
          noteId: note.id,
        });
      },
    }),
    defineTool({
      description: "Close an open loop that is finished or no longer needed.",
      input: { loop_id: z.string() },
      label: () => "Closed an open loop",
      name: "close_open_loop",
      readOnly: false,
      run: (input) => {
        const note = findNote(input.loop_id, "loop");

        repository.saveNote({ ...note, doneAt: host.now() });

        return changed(`Closed: ${note.text}`, {
          doneAt: note.doneAt,
          kind: "set-note-done",
          noteId: note.id,
        });
      },
    }),

    defineTool({
      description:
        "Propose an edit to a journal page. Line numbers come from read_journal or the current view. Each edit replaces lines from_line to to_line (inclusive) with `replacement`; to insert before line N without replacing, use from_line N and to_line N-1. The user sees the change and applies it.",
      input: {
        day,
        edits: z
          .array(
            z.object({
              from_line: z.number().int().positive(),
              replacement: z.string(),
              to_line: z.number().int().nonnegative(),
            })
          )
          .min(1),
        summary: z
          .string()
          .min(1)
          .describe("One short line: what the edit does."),
      },
      label: (input) => `Proposed an edit to ${shortDay(input.day)}`,
      name: "propose_journal_edit",
      readOnly: false,
      run: (input) => {
        const before = journal.read(input.day).markdown;

        let result: ReturnType<typeof applyLineEdits>;

        try {
          result = applyLineEdits(
            before,
            input.edits.map((edit) => ({
              fromLine: edit.from_line,
              replacement: edit.replacement,
              toLine: edit.to_line,
            }))
          );
        } catch (error) {
          throw new ToolError(
            error instanceof Error ? error.message : String(error)
          );
        }

        if (result.markdown === before) {
          throw new ToolError("The edit changes nothing.");
        }

        return propose(input.summary, {
          after: result.markdown,
          before,
          changes: result.changes,
          day: input.day,
          kind: "edit-journal",
        });
      },
    }),
    defineTool({
      description:
        "Propose where Inbox items go: one proposal for one or many items. Use ids from list_inbox, list_contexts and list_projects. The user reviews the plan and applies it.",
      input: {
        items: z.array(filingInput).min(1),
        summary: z
          .string()
          .min(1)
          .describe('One short line, such as "File the 7 Inbox items".'),
      },
      label: (input) =>
        `Proposed where ${input.items.length} Inbox ${input.items.length === 1 ? "item goes" : "items go"}`,
      name: "propose_filing",
      readOnly: false,
      run: (input) => {
        const lookups = lookupsOf(gtd);
        const inbox = new Map(gtd.listInbox().map((task) => [task.id, task]));
        const seen = new Set<string>();

        const items = input.items.map((item) => {
          const task = inbox.get(item.task_id);

          if (task === undefined) {
            throw new ToolError(
              `${item.task_id} is not in the Inbox. Call list_inbox.`
            );
          }

          if (seen.has(task.id)) {
            throw new ToolError(`${task.title} appears twice.`);
          }

          seen.add(task.id);

          return filingItem(item, task, lookups, host.today());
        });

        return propose(input.summary, { items, kind: "file-inbox" });
      },
    }),
    defineTool({
      description: "Propose changes to a task's fields. The user applies them.",
      input: {
        changes: taskChangesInput,
        summary: z.string().min(1),
        task_id: z.string(),
      },
      label: () => "Proposed a task change",
      name: "propose_task_update",
      readOnly: false,
      run: (input) => {
        const task = findTask(gtd, input.task_id);

        const { changes, details } = toTaskChanges(
          input.changes,
          lookupsOf(gtd)
        );

        return propose(input.summary, {
          changes,
          details,
          kind: "update-task",
          taskId: task.id,
          title: task.title,
        });
      },
    }),
    defineTool({
      description: "Propose deleting a task. The user applies it.",
      input: { summary: z.string().min(1), task_id: z.string() },
      label: () => "Proposed deleting a task",
      name: "propose_task_delete",
      readOnly: false,
      run: (input) => {
        const task = findTask(gtd, input.task_id);

        return propose(input.summary, {
          kind: "delete-task",
          taskId: task.id,
          title: task.title,
        });
      },
    }),
  ];
};
