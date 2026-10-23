import type { LocalDate } from "./dates.ts";
import type { Energy } from "./model.ts";

/**
 * The questions GTD asks of every inbox item, in the order it asks them.
 * Which ones appear depends on earlier answers: a non-actionable item never
 * reaches "nextAction", and a two-minute action is simply done.
 */
export type ClarifyStep =
  | "actionable"
  | "disposal"
  | "nextAction"
  | "twoMinutes"
  | "project"
  | "owner"
  | "when";

export type Disposal = "trash" | "someday" | "reference";

export type ProjectAnswer =
  | { kind: "none" }
  | { kind: "existing"; projectId: string }
  | { kind: "new"; name: string; outcome: string };

export type OwnerAnswer =
  | { kind: "me" }
  | { kind: "delegate"; person: string; followUpOn: LocalDate };

export interface WhenAnswer {
  contextId: string | null;
  minutes: number | null;
  energy: Energy | null;
  startOn: LocalDate | null;
  deadline: LocalDate | null;
}

/** Answers collected so far. A missing answer means the question is still open. */
export interface ClarifyAnswers {
  actionable?: boolean;
  disposal?: Disposal;
  nextAction?: string;
  underTwoMinutes?: boolean;
  project?: ProjectAnswer;
  owner?: OwnerAnswer;
  when?: WhenAnswer;
}

export type ClarifyOutcome =
  | { kind: "trash" }
  | { kind: "someday" }
  | { kind: "reference" }
  /** Under two minutes: the user did it on the spot. */
  | { kind: "done" }
  | {
      kind: "action";
      title: string;
      project: ProjectAnswer;
      owner: OwnerAnswer;
      when: WhenAnswer;
    };

export interface ClarifyProgress {
  /** Steps already answered, in the order they were asked. */
  answered: ClarifyStep[];
  /** The question to ask now, or null when the item is fully clarified. */
  current: ClarifyStep | null;
  /** Steps that will follow if the current answer does not end the flow. */
  remaining: ClarifyStep[];
}

const actionPath: ClarifyStep[] = [
  "actionable",
  "nextAction",
  "twoMinutes",
  "project",
  "owner",
  "when",
];

const isAnswered = (step: ClarifyStep, answers: ClarifyAnswers): boolean => {
  switch (step) {
    case "actionable": {
      return answers.actionable !== undefined;
    }

    case "disposal": {
      return answers.disposal !== undefined;
    }

    case "nextAction": {
      return (answers.nextAction ?? "").trim().length > 0;
    }

    case "twoMinutes": {
      return answers.underTwoMinutes !== undefined;
    }

    case "project": {
      return answers.project !== undefined;
    }

    case "owner": {
      return answers.owner !== undefined;
    }

    case "when": {
      return answers.when !== undefined;
    }

    default: {
      return false;
    }
  }
};

const pathFor = (answers: ClarifyAnswers): ClarifyStep[] => {
  if (answers.actionable === false) {
    return ["actionable", "disposal"];
  }

  if (answers.underTwoMinutes === true) {
    return ["actionable", "nextAction", "twoMinutes"];
  }

  // A delegated action has no context or energy for the user, so "when" is skipped.
  if (answers.owner?.kind === "delegate") {
    return ["actionable", "nextAction", "twoMinutes", "project", "owner"];
  }

  return actionPath;
};

export const clarifyProgress = (answers: ClarifyAnswers): ClarifyProgress => {
  const path = pathFor(answers);
  const currentIndex = path.findIndex((step) => !isAnswered(step, answers));

  if (currentIndex === -1) {
    return { answered: path, current: null, remaining: [] };
  }

  return {
    answered: path.slice(0, currentIndex),
    current: path[currentIndex] ?? null,
    remaining: path.slice(currentIndex + 1),
  };
};

const emptyWhen: WhenAnswer = {
  contextId: null,
  deadline: null,
  energy: null,
  minutes: null,
  startOn: null,
};

/** The final decision, or null while questions remain open. */
export const clarifyOutcome = (
  answers: ClarifyAnswers
): ClarifyOutcome | null => {
  if (clarifyProgress(answers).current !== null) {
    return null;
  }

  if (answers.actionable === false) {
    return { kind: answers.disposal ?? "trash" };
  }

  if (answers.underTwoMinutes === true) {
    return { kind: "done" };
  }

  return {
    kind: "action",
    owner: answers.owner ?? { kind: "me" },
    project: answers.project ?? { kind: "none" },
    title: (answers.nextAction ?? "").trim(),
    when: answers.when ?? emptyWhen,
  };
};

/**
 * Clears a step's answer and every answer that depends on it, so changing an
 * early decision never leaves stale later answers behind.
 */
export const reopenStep = (
  answers: ClarifyAnswers,
  step: ClarifyStep
): ClarifyAnswers => {
  const order: ClarifyStep[] = [
    "actionable",
    "disposal",
    "nextAction",
    "twoMinutes",
    "project",
    "owner",
    "when",
  ];

  const keep = new Set(order.slice(0, order.indexOf(step)));

  return {
    actionable: keep.has("actionable") ? answers.actionable : undefined,
    disposal: keep.has("disposal") ? answers.disposal : undefined,
    nextAction: keep.has("nextAction") ? answers.nextAction : undefined,
    owner: keep.has("owner") ? answers.owner : undefined,
    project: keep.has("project") ? answers.project : undefined,
    underTwoMinutes: keep.has("twoMinutes")
      ? answers.underTwoMinutes
      : undefined,
    when: keep.has("when") ? answers.when : undefined,
  };
};
