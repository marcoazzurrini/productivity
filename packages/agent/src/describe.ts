import { parseLocalDate, reviewSteps } from "@productivity/gtd";
import type {
  Context,
  GtdStore,
  LocalDate,
  ProjectSummary,
  Task,
} from "@productivity/gtd";

import { numberLines } from "./journal-edits.ts";
import type { ViewContext } from "./model.ts";

/** The journal, as the agent needs it. @productivity/db's JournalStore fits. */
export interface JournalAccess {
  read: (day: LocalDate) => { markdown: string };
  write: (day: LocalDate, markdown: string) => void;
}

/** Context and project names, by id. */
export interface Lookups {
  contexts: ReadonlyMap<string, Context>;
  projects: ReadonlyMap<string, ProjectSummary>;
}

export const lookupsOf = (gtd: GtdStore): Lookups => ({
  contexts: new Map(gtd.listContexts().map((context) => [context.id, context])),
  projects: new Map(gtd.listProjects().map((project) => [project.id, project])),
});

const longDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  weekday: "long",
  year: "numeric",
});

const shortDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  weekday: "short",
});

/** "Saturday, October 24, 2026", as the app writes dates. */
export const longDay = (day: LocalDate): string =>
  longDate.format(parseLocalDate(day));

/** "Sat Oct 24". */
export const shortDay = (day: LocalDate): string =>
  shortDate.format(parseLocalDate(day)).replace(",", "");

/** Long pages are cut so one page cannot fill the model's context. */
const maxPageChars = 20_000;

export const describeJournal = (day: LocalDate, markdown: string): string => {
  const header = `Journal page for ${longDay(day)} (${day})`;

  if (markdown.trim() === "") {
    return `${header}: nothing written yet.`;
  }

  const page =
    markdown.length > maxPageChars
      ? `${numberLines(markdown.slice(0, maxPageChars))}\n[… page cut here]`
      : numberLines(markdown);

  return `${header}, each line numbered:\n<journal_page>\n${page}\n</journal_page>`;
};

const maxNoteChars = 200;

export const describeTask = (task: Task, lookups: Lookups): string => {
  const parts = [
    task.contextId === null ? null : lookups.contexts.get(task.contextId)?.name,
    task.projectId === null
      ? null
      : `project: ${lookups.projects.get(task.projectId)?.name ?? "?"}`,
    task.minutes === null ? null : `${task.minutes} min`,
    task.energy === null ? null : `${task.energy} energy`,
    task.startOn === null ? null : `starts ${task.startOn}`,
    task.deadline === null ? null : `due ${task.deadline}`,
    task.waitingOn === null ? null : `waiting on ${task.waitingOn}`,
    task.followUpOn === null ? null : `follow up ${task.followUpOn}`,
    task.block === null ? null : `on the calendar ${task.block.start}`,
    task.completedAt === null ? null : "done",
    task.list === "inbox" ? `captured ${task.capturedAt}` : null,
  ].filter((part) => part !== null && part !== undefined);

  const notes =
    task.notes.trim() === ""
      ? ""
      : `\n  notes: ${task.notes.trim().slice(0, maxNoteChars).replaceAll("\n", " ")}`;

  return `- [${task.id}] ${task.title}${parts.length === 0 ? "" : ` (${parts.join(", ")})`}${notes}`;
};

export const describeTasks = (
  title: string,
  tasks: readonly Task[],
  lookups: Lookups
): string =>
  tasks.length === 0
    ? `${title}: empty.`
    : `${title}, ${tasks.length} ${tasks.length === 1 ? "item" : "items"}:\n${tasks
        .map((task) => describeTask(task, lookups))
        .join("\n")}`;

export const describeContexts = (lookups: Lookups): string =>
  [...lookups.contexts.values()]
    .map((context) => `- [${context.id}] ${context.name}`)
    .join("\n");

export const describeProjects = (lookups: Lookups): string =>
  [...lookups.projects.values()]
    .map(
      (project) =>
        `- [${project.id}] ${project.name} (${project.status}, ${project.openCount} open)${
          project.outcome === "" ? "" : ` — done when: ${project.outcome}`
        }`
    )
    .join("\n");

export const describeProject = (
  gtd: GtdStore,
  projectId: string,
  lookups: Lookups
): string => {
  const detail = gtd.getProject(projectId);

  if (detail === null) {
    return `There is no project with id ${projectId}.`;
  }

  const { project } = detail;

  return [
    `Project [${project.id}] ${project.name} (${project.status})`,
    project.outcome === "" ? null : `Done when: ${project.outcome}`,
    project.deadline === null ? null : `Deadline: ${project.deadline}`,
    detail.area === null ? null : `Area: ${detail.area.name}`,
    describeTasks("Tasks", detail.tasks, lookups),
  ]
    .filter((line) => line !== null)
    .join("\n");
};

const describeReview = (gtd: GtdStore): string => {
  const review = gtd.getReview();
  const checked = new Set(review.checked);

  return [
    `Weekly Review. Last done: ${review.lastReviewedOn ?? "never"}.`,
    ...reviewSteps.map(
      (step) => `- [${checked.has(step.id) ? "x" : " "}] ${step.title}`
    ),
  ].join("\n");
};

/** What the user is looking at, in words, for the start of their message. */
export const describeView = (
  view: ViewContext,
  gtd: GtdStore,
  journal: JournalAccess
): string => {
  const lookups = lookupsOf(gtd);

  switch (view.view) {
    case "journal": {
      return describeJournal(view.day, journal.read(view.day).markdown);
    }

    case "inbox": {
      return describeTasks("The Inbox", gtd.listInbox(), lookups);
    }

    case "next-actions": {
      return describeTasks("Next Actions", gtd.listNextActions(), lookups);
    }

    case "upcoming": {
      return describeTasks("Upcoming", gtd.listUpcoming(), lookups);
    }

    case "waiting": {
      return describeTasks("Waiting For", gtd.listWaiting(), lookups);
    }

    case "someday": {
      return describeTasks("Someday / Maybe", gtd.listSomeday(), lookups);
    }

    case "project": {
      return describeProject(gtd, view.projectId, lookups);
    }

    default: {
      return describeReview(gtd);
    }
  }
};

/** A short name for the view: "the journal for Sat Oct 24". */
export const viewName = (view: ViewContext): string => {
  switch (view.view) {
    case "journal": {
      return `the journal for ${shortDay(view.day)}`;
    }

    case "next-actions": {
      return "Next Actions";
    }

    case "project": {
      return "a project";
    }

    case "review": {
      return "the Weekly Review";
    }

    case "someday": {
      return "Someday / Maybe";
    }

    case "upcoming": {
      return "Upcoming";
    }

    case "waiting": {
      return "Waiting For";
    }

    default: {
      return "the Inbox";
    }
  }
};
