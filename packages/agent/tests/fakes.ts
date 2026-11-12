import type { GtdStore, LocalDate, Task } from "@productivity/gtd";

import type { JournalAccess } from "../src/index.ts";

/** Friday 23 October 2026, 14:40 local time: the day the design shows. */
export const fixedNow = new Date(2026, 9, 23, 14, 40);

const task = (id: string, title: string, list: Task["list"]): Task => ({
  block: null,
  capturedAt: "2026-10-23T09:00",
  completedAt: null,
  contextId: null,
  deadline: null,
  energy: null,
  followUpOn: null,
  headingId: null,
  id,
  list,
  minutes: null,
  notes: "",
  projectId: null,
  source: "manual",
  starred: false,
  startOn: null,
  title,
  waitingOn: null,
});

const unused = (): never => {
  throw new Error("Not used by the agent's tests.");
};

/**
 * Just enough of the GTD store for the agent's tools, in memory. The
 * desktop tests run the agent against the real SQLite store.
 */
export const fakeGtd = () => {
  const tasks = new Map<string, Task>([
    ["t-dentist", task("t-dentist", "Call dentist about cleaning", "inbox")],
    ["t-passport", task("t-passport", "Renew passport before April", "inbox")],
    ["t-slides", task("t-slides", "Draft slide outline", "next")],
  ]);

  const open = (list: Task["list"]) =>
    [...tasks.values()].filter(
      (each) => each.list === list && each.completedAt === null
    );

  const find = (id: string): Task => {
    const found = tasks.get(id);

    if (found === undefined) {
      throw new Error(`No task with id "${id}".`);
    }

    return found;
  };

  const store: GtdStore = {
    activate: unused,
    capture: (input) => {
      const captured = task(crypto.randomUUID(), input.title, "inbox");

      tasks.set(captured.id, { ...captured, notes: input.notes ?? "" });

      return captured;
    },
    clarify: (taskId, outcome) => {
      const item = find(taskId);

      if (outcome.kind === "trash") {
        tasks.delete(taskId);
      } else if (outcome.kind === "action") {
        tasks.set(taskId, {
          ...item,
          contextId: outcome.when.contextId,
          list: outcome.owner.kind === "me" ? "next" : "waiting",
          title: outcome.title,
        });
      } else {
        tasks.set(taskId, {
          ...item,
          list: outcome.kind === "done" ? "next" : outcome.kind,
        });
      }
    },
    createHeading: unused,
    createProject: unused,
    deleteHeading: unused,
    deleteTask: (taskId) => {
      tasks.delete(taskId);
    },
    finishReview: unused,
    followUp: unused,
    getProject: () => null,
    getReview: () => ({ checked: [], lastReviewedOn: null }),
    getWeek: (day) => ({ blocks: [], days: [day] }),
    listAreas: () => [],
    listContexts: () => [{ color: "green", id: "c-calls", name: "@Calls" }],
    listInbox: () => open("inbox"),
    listNextActions: () => open("next"),
    listProjects: () => [],
    listSomeday: () => open("someday"),
    listUpcoming: () => [],
    listWaiting: () => open("waiting"),
    overview: unused,
    renameHeading: unused,
    scheduleBlock: unused,
    setCompleted: (taskId, completed) => {
      const item = find(taskId);

      const updated = {
        ...item,
        completedAt: completed ? "2026-10-23T14:40" : null,
      };

      tasks.set(taskId, updated);

      return updated;
    },
    setReviewStep: unused,
    updateProject: unused,
    updateTask: (taskId, changes) => {
      const updated = { ...find(taskId), ...changes };

      tasks.set(taskId, updated);

      return updated;
    },
  };

  return { store, tasks };
};

export const fakeJournal = (): JournalAccess & {
  pages: Map<LocalDate, string>;
} => {
  const pages = new Map<LocalDate, string>();

  return {
    pages,
    read: (day) => ({ markdown: pages.get(day) ?? "" }),
    write: (day, markdown) => {
      pages.set(day, markdown);
    },
  };
};
