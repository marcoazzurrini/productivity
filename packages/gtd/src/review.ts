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
    hint: "Receipts, notes and screenshots go into the Inbox",
    id: "collect",
    phase: "clear",
    title: "Collect loose papers and notes",
  },
  {
    hint: "Capture anything new that is on your mind",
    id: "mind-sweep",
    phase: "clear",
    title: "Empty your head",
  },
  // Last in its phase: by now everything loose is in the Inbox.
  {
    hint: "Decide what every item is and what happens next",
    id: "inbox",
    phase: "clear",
    title: "Clarify the Inbox to zero",
  },
  {
    hint: "Last 7 days: anything to follow up?",
    id: "past-calendar",
    phase: "current",
    title: "Review the past calendar",
  },
  {
    hint: "Next 2 weeks: anything to prepare?",
    id: "upcoming-calendar",
    phase: "current",
    title: "Review the upcoming calendar",
  },
  {
    hint: "Mark done, drop stale ones, fix contexts",
    id: "next-actions",
    phase: "current",
    title: "Review Next Actions",
  },
  {
    hint: "Nudge anyone you have not heard from",
    id: "waiting-for",
    phase: "current",
    title: "Review Waiting For",
  },
  {
    hint: "Every active project needs at least one next action",
    id: "projects",
    phase: "current",
    title: "Review Projects",
  },
  {
    hint: "Activate anything that is now worth doing",
    id: "someday",
    phase: "creative",
    title: "Review Someday / Maybe",
  },
  {
    hint: "Any new projects or ideas to capture?",
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
