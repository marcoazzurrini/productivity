import { datePart } from "./dates.ts";
import type { LocalDate } from "./dates.ts";
import type { Heading, Task } from "./model.ts";

export interface ProjectSection {
  /** Null holds the to-dos that sit under no heading. */
  heading: Heading | null;
  tasks: Task[];
}

export interface ProjectGroups {
  /**
   * The project's own actions: those without a heading first, then one
   * section per heading in the user's order. A heading with no to-dos still
   * gets its section, so a new heading has a place to show.
   */
  sections: ProjectSection[];
  /** What the user handed to someone else. */
  waiting: Task[];
  /** Completed before today. Out of the way until the user asks for them. */
  earlier: Task[];
  doneCount: number;
  totalCount: number;
}

/** Open, or ticked today: a to-do just completed stays where the user left it. */
const staysInPlace = (task: Task, today: LocalDate): boolean =>
  task.completedAt === null || datePart(task.completedAt) === today;

/** Open to-dos lead; the ones ticked today follow, in their old order. */
const openFirst = (tasks: Task[]): Task[] => [
  ...tasks.filter((task) => task.completedAt === null),
  ...tasks.filter((task) => task.completedAt !== null),
];

/**
 * A project's to-dos as the project screen lays them out: by heading, with
 * Waiting For apart, and older completed to-dos set aside.
 */
export const groupProjectTasks = (
  tasks: Task[],
  headings: Heading[],
  today: LocalDate
): ProjectGroups => {
  const known = new Set(headings.map((heading) => heading.id));
  const shown = tasks.filter((task) => staysInPlace(task, today));
  const actions = shown.filter((task) => task.list === "next");
  const waiting = shown.filter((task) => task.list === "waiting");
  const placed = new Set([...actions, ...waiting]);

  const loose = actions.filter(
    (task) => task.headingId === null || !known.has(task.headingId)
  );

  return {
    doneCount: tasks.filter((task) => task.completedAt !== null).length,
    earlier: tasks.filter(
      (task) => task.completedAt !== null && !placed.has(task)
    ),
    sections: [
      ...(loose.length === 0
        ? []
        : [{ heading: null, tasks: openFirst(loose) }]),
      ...headings.map((heading) => ({
        heading,
        tasks: openFirst(
          actions.filter((task) => task.headingId === heading.id)
        ),
      })),
    ],
    totalCount: tasks.length,
    waiting: openFirst(waiting),
  };
};
