import type { ClarifyOutcome } from "./clarify.ts";
import type { LocalDate } from "./dates.ts";
import type {
  Area,
  CaptureSource,
  Context,
  Energy,
  Project,
  Task,
  TimeBlock,
} from "./model.ts";
import type { ReviewStepId } from "./review.ts";

export interface CaptureInput {
  title: string;
  notes?: string;
  source?: CaptureSource;
}

/** Fields the user can edit on a task after it is clarified. */
export interface TaskChanges {
  title?: string;
  notes?: string;
  contextId?: string | null;
  projectId?: string | null;
  minutes?: number | null;
  energy?: Energy | null;
  startOn?: LocalDate | null;
  deadline?: LocalDate | null;
  starred?: boolean;
  followUpOn?: LocalDate | null;
}

export interface NewProject {
  name: string;
  areaId: string | null;
  outcome: string;
  deadline: LocalDate | null;
}

export interface Overview {
  today: LocalDate;
  inbox: number;
  nextActions: number;
  waiting: number;
  waitingDue: number;
  someday: number;
  contexts: { id: string; count: number }[];
  review: { due: boolean; dueOn: LocalDate };
}

export interface ProjectSummary extends Project {
  openCount: number;
  doneCount: number;
}

export interface ProjectDetail {
  project: Project;
  area: Area | null;
  tasks: Task[];
}

export interface Week {
  days: LocalDate[];
  /** Tasks the user dragged onto the calendar. Events live in @productivity/calendar. */
  blocks: Task[];
}

export interface ReviewState {
  checked: ReviewStepId[];
  lastReviewedOn: LocalDate | null;
}

/**
 * Everything the app can ask of its GTD data. The storage engine, IDs, clock
 * and SQL stay behind this interface; callers deal only in domain values.
 */
export interface GtdStore {
  overview: () => Overview;

  capture: (input: CaptureInput) => Task;
  listInbox: () => Task[];
  clarify: (taskId: string, outcome: ClarifyOutcome) => void;

  listNextActions: () => Task[];
  listUpcoming: () => Task[];
  listWaiting: () => Task[];
  listSomeday: () => Task[];
  /** Turns a waiting item's chase into a next action. Returns that action. */
  followUp: (taskId: string) => Task;

  updateTask: (taskId: string, changes: TaskChanges) => Task;
  setCompleted: (taskId: string, completed: boolean) => Task;
  deleteTask: (taskId: string) => void;
  /** Moves a Someday item back into play as a next action. */
  activate: (taskId: string) => Task;

  listContexts: () => Context[];
  listAreas: () => Area[];
  listProjects: () => ProjectSummary[];
  getProject: (projectId: string) => ProjectDetail | null;
  createProject: (project: NewProject) => Project;

  getWeek: (day: LocalDate) => Week;
  /** Places a task on the calendar, or removes it with null. */
  scheduleBlock: (taskId: string, block: TimeBlock | null) => Task;

  getReview: () => ReviewState;
  setReviewStep: (stepId: ReviewStepId, checked: boolean) => ReviewState;
  finishReview: () => ReviewState;
}

export type GtdStoreMethod = keyof GtdStore;

/**
 * Every store method by name. Process boundaries (Electron IPC) use this list
 * to refuse anything that is not part of the interface.
 */
export const gtdStoreMethods = [
  "overview",
  "capture",
  "listInbox",
  "clarify",
  "listNextActions",
  "listUpcoming",
  "listWaiting",
  "listSomeday",
  "followUp",
  "updateTask",
  "setCompleted",
  "deleteTask",
  "activate",
  "listContexts",
  "listAreas",
  "listProjects",
  "getProject",
  "createProject",
  "getWeek",
  "scheduleBlock",
  "getReview",
  "setReviewStep",
  "finishReview",
] as const satisfies readonly GtdStoreMethod[];

// Fails to compile if a method is added to GtdStore but not to the list.
type MissingMethod = Exclude<GtdStoreMethod, (typeof gtdStoreMethods)[number]>;

const everyMethodListed: [MissingMethod] extends [never] ? true : never = true;

export const isGtdStoreMethod = (name: string): name is GtdStoreMethod =>
  everyMethodListed && gtdStoreMethods.some((method) => method === name);

/** The same store seen from another process: every call is asynchronous. */
export type RemoteGtdStore = {
  [Method in GtdStoreMethod]: (
    ...args: Parameters<GtdStore[Method]>
  ) => Promise<ReturnType<GtdStore[Method]>>;
};

/** Sends one store call across a process boundary and resolves with its result. */
export type StoreTransport = <Method extends GtdStoreMethod>(
  method: Method,
  args: Parameters<GtdStore[Method]>
) => Promise<ReturnType<GtdStore[Method]>>;

/**
 * A GtdStore living in another process, reached through `transport`. Every
 * method is listed so the compiler checks each signature end to end.
 */
export const createRemoteStore = (
  transport: StoreTransport
): RemoteGtdStore => ({
  activate: (...args) => transport("activate", args),
  capture: (...args) => transport("capture", args),
  clarify: (...args) => transport("clarify", args),
  createProject: (...args) => transport("createProject", args),
  deleteTask: (...args) => transport("deleteTask", args),
  finishReview: (...args) => transport("finishReview", args),
  followUp: (...args) => transport("followUp", args),
  getProject: (...args) => transport("getProject", args),
  getReview: (...args) => transport("getReview", args),
  getWeek: (...args) => transport("getWeek", args),
  listAreas: (...args) => transport("listAreas", args),
  listContexts: (...args) => transport("listContexts", args),
  listInbox: (...args) => transport("listInbox", args),
  listNextActions: (...args) => transport("listNextActions", args),
  listProjects: (...args) => transport("listProjects", args),
  listSomeday: (...args) => transport("listSomeday", args),
  listUpcoming: (...args) => transport("listUpcoming", args),
  listWaiting: (...args) => transport("listWaiting", args),
  overview: (...args) => transport("overview", args),
  scheduleBlock: (...args) => transport("scheduleBlock", args),
  setCompleted: (...args) => transport("setCompleted", args),
  setReviewStep: (...args) => transport("setReviewStep", args),
  updateTask: (...args) => transport("updateTask", args),
});
