import { addDays } from "./dates.ts";
import type { LocalDate } from "./dates.ts";
import type { Task } from "./model.ts";

/** How long to wait again after following up, unless the user picks a date. */
export const followUpInterval = 3;

export const isFollowUpDue = (task: Task, today: LocalDate): boolean =>
  task.list === "waiting" &&
  task.completedAt === null &&
  task.followUpOn !== null &&
  task.followUpOn <= today;

export interface WaitingGroups {
  /** Follow-up date reached: time to chase. */
  due: Task[];
  /** Still within the agreed time. */
  later: Task[];
}

export const groupWaiting = (
  tasks: Task[],
  today: LocalDate
): WaitingGroups => {
  const open = tasks
    .filter((task) => task.list === "waiting" && task.completedAt === null)
    .toSorted((a, b) =>
      (a.followUpOn ?? "9999").localeCompare(b.followUpOn ?? "9999")
    );

  return {
    due: open.filter((task) => isFollowUpDue(task, today)),
    later: open.filter((task) => !isFollowUpDue(task, today)),
  };
};

const lowerFirst = (text: string): string =>
  text.length > 1 && text[1] === text[1]?.toLowerCase()
    ? `${text[0]?.toLowerCase() ?? ""}${text.slice(1)}`
    : text;

export interface FollowUp {
  /** The chase itself, as a next action the user does. */
  actionTitle: string;
  /** When to check on the waiting item again. */
  nextFollowUpOn: LocalDate;
}

/**
 * Following up is the user's own action, so it becomes a next action. The
 * waiting item stays open with a later follow-up date until the answer comes.
 */
export const planFollowUp = (task: Task, today: LocalDate): FollowUp => {
  const who = task.waitingOn ?? "them";

  return {
    actionTitle: `Follow up with ${who} about ${lowerFirst(task.title)}`,
    nextFollowUpOn: addDays(today, followUpInterval),
  };
};
