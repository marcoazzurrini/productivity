import { DatabaseSync } from "node:sqlite";

import type { CalendarRepository } from "@productivity/calendar";
import {
  isReviewDue,
  nextReviewOn,
  planFollowUp,
  reviewSteps as allReviewSteps,
  toLocalDate,
  toLocalDateTime,
  weekDays,
} from "@productivity/gtd";
import type {
  CaptureInput,
  ClarifyOutcome,
  GtdStore,
  NewProject,
  Overview,
  Project,
  ProjectSummary,
  ReviewState,
  Task,
  TaskChanges,
} from "@productivity/gtd";
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-sqlite";

import { createCalendarRepository } from "./calendar.ts";
import { createJournal } from "./journal.ts";
import type { JournalStore } from "./journal.ts";
import { migrate } from "./migrate.ts";
import { toProject, toTask, toTaskRow } from "./rows.ts";
import {
  areas,
  calendarEvents,
  contexts,
  projects,
  reviewSteps,
  settings,
  tasks,
} from "./schema.ts";
import { defaultAreas, defaultContexts, sampleData } from "./seed.ts";

export interface StoreOptions {
  /** A file path, or ":memory:" for a throwaway database. */
  path: string;
  /** Defaults to the system clock. Tests pass a fixed one. */
  clock?: () => Date;
  /** Fill a brand-new database with example content. */
  sample?: boolean;
}

export interface Store extends GtdStore {
  /** The journal, kept in the same database. */
  journal: JournalStore;
  /** Storage for @productivity/calendar, kept in the same database. */
  calendarRepository: CalendarRepository;
  close: () => void;
}

export class NotFoundError extends Error {
  constructor(kind: string, id: string) {
    super(`No ${kind} with id "${id}".`);
    this.name = "NotFoundError";
  }
}

const newId = (): string => crypto.randomUUID();

/** SQLite's implicit row id. Breaks ties between items captured in the same minute. */
const rowid = sql`rowid`;

/** Next actions the user can do now: open, and not deferred to later. */
const availableNext = (day: string): SQL | undefined =>
  and(
    eq(tasks.list, "next"),
    isNull(tasks.completedAt),
    or(isNull(tasks.startOn), lte(tasks.startOn, day))
  );

const openIn = (list: Task["list"]): SQL | undefined =>
  and(eq(tasks.list, list), isNull(tasks.completedAt));

/**
 * Opens (and if needed creates) the GTD database. Everything about SQL, IDs
 * and time stays in here; callers see only the GtdStore interface.
 */
export const openStore = (options: StoreOptions): Store => {
  const client = new DatabaseSync(options.path);
  const db = drizzle({ client });
  const clock = options.clock ?? (() => new Date());
  const today = (): string => toLocalDate(clock());
  const now = (): string => toLocalDateTime(clock());

  client.exec("pragma foreign_keys = on");
  client.exec("pragma journal_mode = wal");

  const isNew = migrate(client);

  const countTasks = (where: SQL | undefined): number =>
    db.select({ count: count() }).from(tasks).where(where).get()?.count ?? 0;

  const findTask = (taskId: string): Task => {
    const row = db.select().from(tasks).where(eq(tasks.id, taskId)).get();

    if (row === undefined) {
      throw new NotFoundError("task", taskId);
    }

    return toTask(row);
  };

  const insertTask = (task: Task): Task => {
    db.insert(tasks).values(toTaskRow(task)).run();

    return task;
  };

  const blankTask = (title: string): Task => ({
    block: null,
    capturedAt: now(),
    completedAt: null,
    contextId: null,
    deadline: null,
    energy: null,
    followUpOn: null,
    id: newId(),
    list: "inbox",
    minutes: null,
    notes: "",
    projectId: null,
    source: "manual",
    starred: false,
    startOn: null,
    title,
    waitingOn: null,
  });

  const insertProject = (project: NewProject): Project => {
    const created: Project = { ...project, id: newId(), status: "active" };

    db.insert(projects)
      .values({ ...created, createdAt: now() })
      .run();

    return created;
  };

  const getSetting = (key: string): string | null =>
    db.select().from(settings).where(eq(settings.key, key)).get()?.value ??
    null;

  const reviewState = (): ReviewState => {
    const checked = new Set(
      db
        .select()
        .from(reviewSteps)
        .all()
        .map((row) => row.stepId)
    );

    return {
      checked: allReviewSteps.flatMap((step) =>
        checked.has(step.id) ? [step.id] : []
      ),
      lastReviewedOn: getSetting("last_reviewed_on"),
    };
  };

  const seed = (withSample: boolean): void => {
    db.insert(contexts)
      .values(
        defaultContexts.map((context, position) => ({ ...context, position }))
      )
      .run();
    db.insert(areas)
      .values(defaultAreas.map((area, position) => ({ ...area, position })))
      .run();

    if (!withSample) {
      return;
    }

    const sample = sampleData(today());

    db.insert(projects)
      .values(
        sample.projects.map((project) => ({
          ...project,
          createdAt: now(),
          status: "active" as const,
        }))
      )
      .run();

    db.insert(tasks)
      .values(
        sample.tasks.map((task) =>
          toTaskRow({
            ...blankTask(task.title),
            block: task.block ?? null,
            contextId: task.contextId ?? null,
            deadline: task.deadline ?? null,
            energy: task.energy ?? null,
            followUpOn: task.followUpOn ?? null,
            list: task.list,
            minutes: task.minutes ?? null,
            notes: task.notes ?? "",
            projectId: task.projectId ?? null,
            source: task.source ?? "manual",
            starred: task.starred ?? false,
            startOn: task.startOn ?? null,
            waitingOn: task.waitingOn ?? null,
          })
        )
      )
      .run();

    // The migrations created the local calendar these go on.
    db.insert(calendarEvents)
      .values(
        sample.events.map((event) => ({
          ...event,
          calendarId: "local",
          id: newId(),
        }))
      )
      .run();
  };

  if (isNew) {
    db.transaction(() => {
      seed(options.sample === true);
    });
  }

  const clarifyAction = (
    taskId: string,
    outcome: Extract<ClarifyOutcome, { kind: "action" }>
  ): void => {
    let projectId: string | null = null;

    if (outcome.project.kind === "existing") {
      ({ projectId } = outcome.project);
    } else if (outcome.project.kind === "new") {
      projectId = insertProject({
        areaId: null,
        deadline: null,
        name: outcome.project.name,
        outcome: outcome.project.outcome,
      }).id;
    }

    const { owner, when } = outcome;
    const delegated = owner.kind === "delegate";

    db.update(tasks)
      .set({
        contextId: delegated ? null : when.contextId,
        deadline: when.deadline,
        energy: delegated ? null : when.energy,
        followUpOn: delegated ? owner.followUpOn : null,
        list: delegated ? "waiting" : "next",
        minutes: delegated ? null : when.minutes,
        projectId,
        startOn: delegated ? null : when.startOn,
        title: outcome.title,
        waitingOn: delegated ? owner.person : null,
      })
      .where(eq(tasks.id, taskId))
      .run();
  };

  const store: Store = {
    activate: (taskId) => {
      findTask(taskId);
      db.update(tasks).set({ list: "next" }).where(eq(tasks.id, taskId)).run();

      return findTask(taskId);
    },

    calendarRepository: createCalendarRepository(db),

    capture: (input: CaptureInput) => {
      const title = input.title.trim();

      if (title.length === 0) {
        throw new RangeError("A captured item needs a title.");
      }

      return insertTask({
        ...blankTask(title),
        notes: input.notes ?? "",
        source: input.source ?? "manual",
      });
    },

    clarify: (taskId: string, outcome: ClarifyOutcome) => {
      findTask(taskId);

      db.transaction(() => {
        switch (outcome.kind) {
          case "trash": {
            db.delete(tasks).where(eq(tasks.id, taskId)).run();
            break;
          }

          case "someday":
          case "reference": {
            db.update(tasks)
              .set({ list: outcome.kind })
              .where(eq(tasks.id, taskId))
              .run();
            break;
          }

          case "done": {
            db.update(tasks)
              .set({ completedAt: now(), list: "next" })
              .where(eq(tasks.id, taskId))
              .run();
            break;
          }

          case "action": {
            clarifyAction(taskId, outcome);
            break;
          }

          default: {
            break;
          }
        }
      });
    },

    close: () => {
      client.close();
    },

    createProject: insertProject,

    deleteTask: (taskId) => {
      db.delete(tasks).where(eq(tasks.id, taskId)).run();
    },

    finishReview: () => {
      db.transaction(() => {
        db.delete(reviewSteps).run();
        db.insert(settings)
          .values({ key: "last_reviewed_on", value: today() })
          .onConflictDoUpdate({
            set: { value: today() },
            target: settings.key,
          })
          .run();
      });

      return reviewState();
    },

    followUp: (taskId) => {
      const waiting = findTask(taskId);

      if (waiting.list !== "waiting") {
        throw new RangeError("Only Waiting For items can be followed up.");
      }

      const plan = planFollowUp(waiting, today());

      return db.transaction(() => {
        db.update(tasks)
          .set({ followUpOn: plan.nextFollowUpOn })
          .where(eq(tasks.id, taskId))
          .run();

        return insertTask({
          ...blankTask(plan.actionTitle),
          list: "next",
          projectId: waiting.projectId,
        });
      });
    },

    getProject: (projectId) => {
      const row = db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .get();

      if (row === undefined) {
        return null;
      }

      const area =
        row.areaId === null
          ? undefined
          : db
              .select({ id: areas.id, name: areas.name })
              .from(areas)
              .where(eq(areas.id, row.areaId))
              .get();

      return {
        area: area ?? null,
        project: toProject(row),
        tasks: db
          .select()
          .from(tasks)
          .where(eq(tasks.projectId, projectId))
          .orderBy(
            isNotNull(tasks.completedAt),
            asc(tasks.capturedAt),
            asc(rowid)
          )
          .all()
          .map(toTask),
      };
    },

    getReview: reviewState,

    getWeek: (day) => {
      const days = weekDays(day);
      const from = days[0] ?? day;
      const until = `${days[6] ?? day}T23:59`;

      return {
        blocks: db
          .select()
          .from(tasks)
          .where(between(tasks.blockStart, from, until))
          .orderBy(asc(tasks.blockStart))
          .all()
          .map(toTask),
        days,
      };
    },

    journal: createJournal(db, now),

    listAreas: () =>
      db
        .select({ id: areas.id, name: areas.name })
        .from(areas)
        .orderBy(asc(areas.position))
        .all(),

    listContexts: () =>
      db
        .select({ color: contexts.color, id: contexts.id, name: contexts.name })
        .from(contexts)
        .orderBy(asc(contexts.position))
        .all(),

    listInbox: () =>
      db
        .select()
        .from(tasks)
        .where(eq(tasks.list, "inbox"))
        .orderBy(desc(tasks.capturedAt), desc(rowid))
        .all()
        .map(toTask),

    listNextActions: () =>
      db
        .select()
        .from(tasks)
        .where(availableNext(today()))
        .orderBy(asc(tasks.capturedAt), asc(rowid))
        .all()
        .map(toTask),

    listProjects: (): ProjectSummary[] => {
      const openCount = sql<number>`(select count(*) from ${tasks} where ${tasks.projectId} = ${projects.id} and ${tasks.completedAt} is null)`;
      const doneCount = sql<number>`(select count(*) from ${tasks} where ${tasks.projectId} = ${projects.id} and ${tasks.completedAt} is not null)`;

      return db
        .select({ doneCount, openCount, project: projects })
        .from(projects)
        .leftJoin(areas, eq(areas.id, projects.areaId))
        .where(eq(projects.status, "active"))
        .orderBy(
          isNull(areas.position),
          asc(areas.position),
          asc(projects.createdAt)
        )
        .all()
        .map((row) => ({
          ...toProject(row.project),
          doneCount: row.doneCount,
          openCount: row.openCount,
        }));
    },

    listSomeday: () =>
      db
        .select()
        .from(tasks)
        .where(openIn("someday"))
        .orderBy(asc(tasks.capturedAt), asc(rowid))
        .all()
        .map(toTask),

    listUpcoming: () => {
      const day = today();

      return db
        .select()
        .from(tasks)
        .where(
          and(
            openIn("next"),
            or(gt(tasks.startOn, day), gt(tasks.deadline, day))
          )
        )
        .orderBy(sql`coalesce(${tasks.startOn}, ${tasks.deadline})`)
        .all()
        .map(toTask);
    },

    listWaiting: () =>
      db
        .select()
        .from(tasks)
        .where(openIn("waiting"))
        .orderBy(asc(tasks.followUpOn))
        .all()
        .map(toTask),

    overview: (): Overview => {
      const day = today();
      const lastReviewedOn = getSetting("last_reviewed_on");

      return {
        contexts: db
          .select({ count: count(), id: tasks.contextId })
          .from(tasks)
          .where(and(availableNext(day), isNotNull(tasks.contextId)))
          .groupBy(tasks.contextId)
          .all()
          .flatMap((row) =>
            row.id === null ? [] : [{ count: row.count, id: row.id }]
          ),
        inbox: countTasks(eq(tasks.list, "inbox")),
        nextActions: countTasks(availableNext(day)),
        review: {
          due: isReviewDue(lastReviewedOn, day),
          dueOn: nextReviewOn(day),
        },
        someday: countTasks(openIn("someday")),
        today: day,
        waiting: countTasks(openIn("waiting")),
        waitingDue: countTasks(
          and(openIn("waiting"), lte(tasks.followUpOn, day))
        ),
      };
    },

    scheduleBlock: (taskId, block) => {
      findTask(taskId);
      db.update(tasks)
        .set({
          blockEnd: block?.end ?? null,
          blockStart: block?.start ?? null,
        })
        .where(eq(tasks.id, taskId))
        .run();

      return findTask(taskId);
    },

    setCompleted: (taskId, completed) => {
      findTask(taskId);
      db.update(tasks)
        .set({ completedAt: completed ? now() : null })
        .where(eq(tasks.id, taskId))
        .run();

      return findTask(taskId);
    },

    setReviewStep: (stepId, checked) => {
      if (checked) {
        db.insert(reviewSteps).values({ stepId }).onConflictDoNothing().run();
      } else {
        db.delete(reviewSteps).where(eq(reviewSteps.stepId, stepId)).run();
      }

      return reviewState();
    },

    updateTask: (taskId, changes: TaskChanges) => {
      findTask(taskId);

      // Pick the editable fields by name: changes arrive over IPC and may
      // carry anything. Drizzle leaves out fields that are undefined.
      const fields: TaskChanges = {
        contextId: changes.contextId,
        deadline: changes.deadline,
        energy: changes.energy,
        followUpOn: changes.followUpOn,
        minutes: changes.minutes,
        notes: changes.notes,
        projectId: changes.projectId,
        starred: changes.starred,
        startOn: changes.startOn,
        title: changes.title,
      };

      if (Object.values(fields).some((value) => value !== undefined)) {
        db.update(tasks).set(fields).where(eq(tasks.id, taskId)).run();
      }

      return findTask(taskId);
    },
  };

  return store;
};
