import { addDays, parseLocalDate } from "./dates.ts";
import type { LocalDate } from "./dates.ts";

export type ReviewPhase = "clear" | "current" | "creative";

export type ReviewStepId =
  | "collect"
  | "inbox"
  | "mind-sweep"
  | "past-calendar"
  | "upcoming-calendar"
  | "next-actions"
  | "waiting-for"
  | "projects"
  | "someday"
  | "be-creative";

export interface ReviewStep {
  id: ReviewStepId;
  phase: ReviewPhase;
  title: string;
  hint: string;
}

/** David Allen's Weekly Review, in the order it is meant to be done. */
export const reviewSteps: readonly ReviewStep[] = [
  {
    hint: "Notes, receipts, messages, downloads. Put them in the Inbox.",
    id: "collect",
    phase: "clear",
    title: "Collect loose papers and materials",
  },
  {
    hint: "Decide what each item is and where it goes.",
    id: "inbox",
    phase: "clear",
    title: "Clarify the Inbox to zero",
  },
  {
    hint: "Write down anything still on your mind.",
    id: "mind-sweep",
    phase: "clear",
    title: "Empty your head",
  },
  {
    hint: "Look back two weeks for follow-ups you missed.",
    id: "past-calendar",
    phase: "current",
    title: "Review the past calendar",
  },
  {
    hint: "Look ahead and capture what you need to prepare.",
    id: "upcoming-calendar",
    phase: "current",
    title: "Review the upcoming calendar",
  },
  {
    hint: "Tick what is done. Make sure every action is concrete.",
    id: "next-actions",
    phase: "current",
    title: "Review Next Actions",
  },
  {
    hint: "Follow up on anything overdue.",
    id: "waiting-for",
    phase: "current",
    title: "Review Waiting For",
  },
  {
    hint: "Every active project needs at least one next action.",
    id: "projects",
    phase: "current",
    title: "Review projects",
  },
  {
    hint: "Promote anything you now want to start.",
    id: "someday",
    phase: "creative",
    title: "Review Someday / Maybe",
  },
  {
    hint: "Any new ideas or projects worth capturing?",
    id: "be-creative",
    phase: "creative",
    title: "Be creative and courageous",
  },
];

export const reviewPhases: readonly { id: ReviewPhase; title: string }[] = [
  { id: "clear", title: "Get clear" },
  { id: "current", title: "Get current" },
  { id: "creative", title: "Get creative" },
];

/** Friday, the conventional Weekly Review day. */
export const reviewWeekday = 5;

/** The next review day on or after `today`. */
export const nextReviewOn = (today: LocalDate): LocalDate => {
  const weekday = parseLocalDate(today).getDay();

  return addDays(today, (reviewWeekday - weekday + 7) % 7);
};

/** Due once a week has passed since the last review, or if there never was one. */
export const isReviewDue = (
  lastReviewedOn: LocalDate | null,
  today: LocalDate
): boolean => lastReviewedOn === null || addDays(lastReviewedOn, 7) <= today;
