import { addDays } from "./dates.ts";
import type { LocalDate } from "./dates.ts";
import type { Context, Energy, Task } from "./model.ts";

export interface NextActionFilter {
  /** Show one context only, or every context when null. */
  contextId: string | null;
  /** Hide actions that need more time than the user has. */
  maxMinutes: number | null;
  /** Hide actions that need more energy than the user has. */
  energy: Energy | null;
}

export const anyNextAction: NextActionFilter = {
  contextId: null,
  energy: null,
  maxMinutes: null,
};

export interface ContextGroup {
  /** Null groups actions that have no context yet. */
  context: Context | null;
  tasks: Task[];
}

const energyRank: Record<Energy, number> = { high: 3, low: 1, medium: 2 };

/** A next action the user can pick right now: not done, not deferred. */
export const isAvailable = (task: Task, today: LocalDate): boolean =>
  task.list === "next" &&
  task.completedAt === null &&
  (task.startOn === null || task.startOn <= today);

const matches = (task: Task, filter: NextActionFilter): boolean => {
  if (filter.contextId !== null && task.contextId !== filter.contextId) {
    return false;
  }

  if (
    filter.maxMinutes !== null &&
    task.minutes !== null &&
    task.minutes > filter.maxMinutes
  ) {
    return false;
  }

  if (
    filter.energy !== null &&
    task.energy !== null &&
    energyRank[task.energy] > energyRank[filter.energy]
  ) {
    return false;
  }

  return true;
};

/**
 * Next actions grouped by context, in the contexts' own order, with
 * context-less actions last. Starred actions lead each group.
 */
export const groupNextActions = (
  tasks: Task[],
  contexts: Context[],
  filter: NextActionFilter,
  today: LocalDate
): ContextGroup[] => {
  const visible = tasks
    .filter((task) => isAvailable(task, today) && matches(task, filter))
    .toSorted((a, b) => Number(b.starred) - Number(a.starred));

  const groups: ContextGroup[] = contexts.map((context) => ({
    context,
    tasks: visible.filter((task) => task.contextId === context.id),
  }));

  const known = new Set(contexts.map((context) => context.id));

  const loose = visible.filter(
    (task) => task.contextId === null || !known.has(task.contextId)
  );

  return [...groups, { context: null, tasks: loose }].filter(
    (group) => group.tasks.length > 0
  );
};

export interface UpcomingDay {
  date: LocalDate;
  tasks: Task[];
}

/**
 * Deferred actions and deadlines from tomorrow on, grouped by the day they
 * become relevant. This is the GTD "tickler": things to see again later.
 */
export const upcomingDays = (
  tasks: Task[],
  today: LocalDate
): UpcomingDay[] => {
  const byDay = new Map<LocalDate, Task[]>();

  for (const task of tasks) {
    if (task.completedAt !== null || task.list !== "next") {
      continue;
    }

    const day =
      task.startOn !== null && task.startOn > today
        ? task.startOn
        : task.deadline;

    if (day === null || day <= today) {
      continue;
    }

    byDay.set(day, [...(byDay.get(day) ?? []), task]);
  }

  return [...byDay.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([date, dayTasks]) => ({ date, tasks: dayTasks }));
};

export const isOverdue = (task: Task, today: LocalDate): boolean =>
  task.completedAt === null && task.deadline !== null && task.deadline < today;

export const isDueSoon = (task: Task, today: LocalDate): boolean =>
  task.deadline !== null &&
  task.deadline >= today &&
  task.deadline <= addDays(today, 2);
