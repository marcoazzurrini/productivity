import { DatabaseSync } from "node:sqlite";
import type { SQLInputValue } from "node:sqlite";

import {
  isReviewDue,
  nextReviewOn,
  planFollowUp,
  reviewSteps,
  toLocalDate,
  toLocalDateTime,
  weekDays,
} from "@productivity/gtd";
import type {
  CalendarEvent,
  CaptureInput,
  ClarifyOutcome,
  GtdStore,
  NewEvent,
  NewProject,
  Overview,
  Project,
  ProjectSummary,
  ReviewState,
  Task,
  TaskChanges,
} from "@productivity/gtd";

import {
  count,
  readText,
  toContext,
  toEvent,
  toProject,
  toTask,
} from "./rows.ts";
import type { Row } from "./rows.ts";
import { migrations } from "./schema.ts";
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
  close: () => void;
}

export class NotFoundError extends Error {
  constructor(kind: string, id: string) {
    super(`No ${kind} with id "${id}".`);
    this.name = "NotFoundError";
  }
}

/** Applies pending migrations. Returns true when the database was brand new. */
const migrate = (db: DatabaseSync): boolean => {
  const version = count(
    db.prepare("select user_version as count from pragma_user_version").get()
  );

  for (const [index, sql] of migrations.entries()) {
    if (index < version) {
      continue;
    }

    db.exec("begin");

    try {
      db.exec(sql);
      db.exec(`pragma user_version = ${index + 1}`);
      db.exec("commit");
    } catch (error) {
      db.exec("rollback");
      throw error;
    }
  }

  return version === 0;
};

const editableFields = [
  "contextId",
  "deadline",
  "energy",
  "followUpOn",
  "minutes",
  "notes",
  "projectId",
  "starred",
  "startOn",
  "title",
] as const satisfies readonly (keyof TaskChanges)[];

const newId = (): string => crypto.randomUUID();

/** Column names for each editable task field. */
const taskColumns: Record<(typeof editableFields)[number], string> = {
  contextId: "context_id",
  deadline: "deadline",
  energy: "energy",
  followUpOn: "follow_up_on",
  minutes: "minutes",
  notes: "notes",
  projectId: "project_id",
  starred: "starred",
  startOn: "start_on",
  title: "title",
};

const toInput = (value: string | number | boolean | null): SQLInputValue => {
  if (value === true) {
    return 1;
  }

  return value === false ? 0 : value;
};

/**
 * Opens (and if needed creates) the GTD database. Everything about SQL, IDs
 * and time stays in here; callers see only the GtdStore interface.
 */
export const openStore = (options: StoreOptions): Store => {
  const db = new DatabaseSync(options.path);
  const clock = options.clock ?? (() => new Date());
  const today = (): string => toLocalDate(clock());
  const now = (): string => toLocalDateTime(clock());

  db.exec("pragma foreign_keys = on");
  db.exec("pragma journal_mode = wal");

  const isNew = migrate(db);

  const all = (sql: string, ...params: SQLInputValue[]): Row[] =>
    db.prepare(sql).all(...params);

  const one = (sql: string, ...params: SQLInputValue[]): Row | undefined =>
    db.prepare(sql).get(...params);

  const run = (sql: string, ...params: SQLInputValue[]): void => {
    db.prepare(sql).run(...params);
  };

  const countOf = (sql: string, ...params: SQLInputValue[]): number =>
    count(one(`select count(*) as count from tasks where ${sql}`, ...params));

  const transaction = <Result>(work: () => Result): Result => {
    db.exec("begin");

    try {
      const result = work();

      db.exec("commit");

      return result;
    } catch (error) {
      db.exec("rollback");
      throw error;
    }
  };

  const findTask = (taskId: string): Task => {
    const row = one("select * from tasks where id = ?", taskId);

    if (row === undefined) {
      throw new NotFoundError("task", taskId);
    }

    return toTask(row);
  };

  const insertTask = (task: Task): Task => {
    run(
      `insert into tasks (
        id, title, notes, list, source, captured_at, project_id, context_id,
        minutes, energy, start_on, deadline, starred, waiting_on, follow_up_on,
        block_start, block_end, completed_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id,
      task.title,
      task.notes,
      task.list,
      task.source,
      task.capturedAt,
      task.projectId,
      task.contextId,
      task.minutes,
      task.energy,
      task.startOn,
      task.deadline,
      task.starred ? 1 : 0,
      task.waitingOn,
      task.followUpOn,
      task.block?.start ?? null,
      task.block?.end ?? null,
      task.completedAt
    );

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

    run(
      `insert into projects (id, name, area_id, outcome, deadline, status, created_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
      created.id,
      created.name,
      created.areaId,
      created.outcome,
      created.deadline,
      created.status,
      now()
    );

    return created;
  };

  const getSetting = (key: string): string | null => {
    const row = one("select value from settings where key = ?", key);

    return row === undefined ? null : readText(row, "value");
  };

  const reviewState = (): ReviewState => ({
    checked: all("select step_id from review_steps").flatMap((row) => {
      const stepId = readText(row, "step_id");

      return reviewSteps.flatMap((step) =>
        step.id === stepId ? [step.id] : []
      );
    }),
    lastReviewedOn: getSetting("last_reviewed_on"),
  });

  const availableNext = `list = 'next' and completed_at is null
    and (start_on is null or start_on <= ?)`;

  const seed = (withSample: boolean): void => {
    for (const [position, context] of defaultContexts.entries()) {
      run(
        "insert into contexts (id, name, color, position) values (?, ?, ?, ?)",
        context.id,
        context.name,
        context.color,
        position
      );
    }

    for (const [position, area] of defaultAreas.entries()) {
      run(
        "insert into areas (id, name, position) values (?, ?, ?)",
        area.id,
        area.name,
        position
      );
    }

    if (!withSample) {
      return;
    }

    const sample = sampleData(today());

    for (const project of sample.projects) {
      run(
        `insert into projects (id, name, area_id, outcome, deadline, status, created_at)
         values (?, ?, ?, ?, ?, 'active', ?)`,
        project.id,
        project.name,
        project.areaId,
        project.outcome,
        project.deadline,
        now()
      );
    }

    for (const task of sample.tasks) {
      insertTask({
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
      });
    }

    for (const event of sample.events) {
      run(
        "insert into events (id, title, kind, start, end_at, all_day) values (?, ?, ?, ?, ?, ?)",
        newId(),
        event.title,
        event.kind,
        event.start,
        event.end,
        event.allDay === true ? 1 : 0
      );
    }
  };

  if (isNew) {
    transaction(() => {
      seed(options.sample === true);
    });
  }

  const store: Store = {
    activate: (taskId) => {
      findTask(taskId);
      run("update tasks set list = 'next' where id = ?", taskId);

      return findTask(taskId);
    },

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

      transaction(() => {
        switch (outcome.kind) {
          case "trash": {
            run("delete from tasks where id = ?", taskId);
            break;
          }

          case "someday":
          case "reference": {
            run("update tasks set list = ? where id = ?", outcome.kind, taskId);
            break;
          }

          case "done": {
            run(
              "update tasks set list = 'next', completed_at = ? where id = ?",
              now(),
              taskId
            );
            break;
          }

          case "action": {
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

            const delegated = outcome.owner.kind === "delegate";

            run(
              `update tasks set
                 title = ?, list = ?, project_id = ?, context_id = ?, minutes = ?,
                 energy = ?, start_on = ?, deadline = ?, waiting_on = ?, follow_up_on = ?
               where id = ?`,
              outcome.title,
              delegated ? "waiting" : "next",
              projectId,
              delegated ? null : outcome.when.contextId,
              delegated ? null : outcome.when.minutes,
              delegated ? null : outcome.when.energy,
              delegated ? null : outcome.when.startOn,
              outcome.when.deadline,
              outcome.owner.kind === "delegate" ? outcome.owner.person : null,
              outcome.owner.kind === "delegate"
                ? outcome.owner.followUpOn
                : null,
              taskId
            );
            break;
          }

          default: {
            break;
          }
        }
      });
    },

    close: () => {
      db.close();
    },

    createEvent: (event: NewEvent) => {
      const created: CalendarEvent = { ...event, id: newId() };

      run(
        "insert into events (id, title, kind, start, end_at, all_day) values (?, ?, ?, ?, ?, ?)",
        created.id,
        created.title,
        created.kind,
        created.start,
        created.end,
        created.allDay ? 1 : 0
      );

      return created;
    },

    createProject: insertProject,

    deleteTask: (taskId) => {
      run("delete from tasks where id = ?", taskId);
    },

    finishReview: () => {
      transaction(() => {
        run("delete from review_steps");
        run(
          `insert into settings (key, value) values ('last_reviewed_on', ?)
           on conflict (key) do update set value = excluded.value`,
          today()
        );
      });

      return reviewState();
    },

    followUp: (taskId) => {
      const waiting = findTask(taskId);

      if (waiting.list !== "waiting") {
        throw new RangeError("Only Waiting For items can be followed up.");
      }

      const plan = planFollowUp(waiting, today());

      return transaction(() => {
        run(
          "update tasks set follow_up_on = ? where id = ?",
          plan.nextFollowUpOn,
          taskId
        );

        return insertTask({
          ...blankTask(plan.actionTitle),
          list: "next",
          projectId: waiting.projectId,
        });
      });
    },

    getProject: (projectId) => {
      const row = one("select * from projects where id = ?", projectId);

      if (row === undefined) {
        return null;
      }

      const project = toProject(row);

      const areaRow =
        project.areaId === null
          ? undefined
          : one("select * from areas where id = ?", project.areaId);

      return {
        area:
          areaRow === undefined
            ? null
            : { id: readText(areaRow, "id"), name: readText(areaRow, "name") },
        project,
        tasks: all(
          "select * from tasks where project_id = ? order by completed_at is not null, captured_at, rowid",
          projectId
        ).map(toTask),
      };
    },

    getReview: reviewState,

    getWeek: (day) => {
      const days = weekDays(day);
      const from = days[0] ?? day;
      const until = `${days[6] ?? day}T23:59`;

      return {
        blocks: all(
          "select * from tasks where block_start >= ? and block_start <= ? order by block_start",
          from,
          until
        ).map(toTask),
        days,
        events: all(
          "select * from events where start >= ? and start <= ? order by start",
          from,
          until
        ).map(toEvent),
      };
    },

    listAreas: () =>
      all("select id, name from areas order by position").map((row) => ({
        id: readText(row, "id"),
        name: readText(row, "name"),
      })),

    listContexts: () =>
      all("select * from contexts order by position").map(toContext),

    listInbox: () =>
      all(
        "select * from tasks where list = 'inbox' order by captured_at desc, rowid desc"
      ).map(toTask),

    listNextActions: () =>
      all(
        `select * from tasks where ${availableNext} order by captured_at, rowid`,
        today()
      ).map(toTask),

    listProjects: (): ProjectSummary[] =>
      all(
        `select projects.*,
           (select count(*) from tasks where project_id = projects.id and completed_at is null) as open_count,
           (select count(*) from tasks where project_id = projects.id and completed_at is not null) as done_count
         from projects
         left join areas on areas.id = projects.area_id
         where status = 'active'
         order by areas.position is null, areas.position, projects.created_at`
      ).map((row) => ({
        ...toProject(row),
        doneCount: count({ count: row.done_count ?? 0 }),
        openCount: count({ count: row.open_count ?? 0 }),
      })),

    listSomeday: () =>
      all(
        "select * from tasks where list = 'someday' and completed_at is null order by captured_at, rowid"
      ).map(toTask),

    listUpcoming: () => {
      const day = today();

      return all(
        `select * from tasks
         where list = 'next' and completed_at is null
           and (start_on > ? or deadline > ?)
         order by coalesce(start_on, deadline)`,
        day,
        day
      ).map(toTask);
    },

    listWaiting: () =>
      all(
        "select * from tasks where list = 'waiting' and completed_at is null order by follow_up_on"
      ).map(toTask),

    overview: (): Overview => {
      const day = today();
      const lastReviewedOn = getSetting("last_reviewed_on");

      return {
        contexts: all(
          `select context_id as id, count(*) as count from tasks
           where ${availableNext} and context_id is not null
           group by context_id`,
          day
        ).map((row) => ({ count: count(row), id: readText(row, "id") })),
        inbox: countOf("list = 'inbox'"),
        nextActions: countOf(availableNext, day),
        review: {
          due: isReviewDue(lastReviewedOn, day),
          dueOn: nextReviewOn(day),
        },
        someday: countOf("list = 'someday' and completed_at is null"),
        today: day,
        waiting: countOf("list = 'waiting' and completed_at is null"),
        waitingDue: countOf(
          "list = 'waiting' and completed_at is null and follow_up_on <= ?",
          day
        ),
      };
    },

    scheduleBlock: (taskId, block) => {
      findTask(taskId);
      run(
        "update tasks set block_start = ?, block_end = ? where id = ?",
        block?.start ?? null,
        block?.end ?? null,
        taskId
      );

      return findTask(taskId);
    },

    setCompleted: (taskId, completed) => {
      findTask(taskId);
      run(
        "update tasks set completed_at = ? where id = ?",
        completed ? now() : null,
        taskId
      );

      return findTask(taskId);
    },

    setReviewStep: (stepId, checked) => {
      run(
        checked
          ? "insert or ignore into review_steps (step_id) values (?)"
          : "delete from review_steps where step_id = ?",
        stepId
      );

      return reviewState();
    },

    updateTask: (taskId, changes: TaskChanges) => {
      findTask(taskId);

      const fields = editableFields.flatMap((field) => {
        const value = changes[field];

        return value === undefined
          ? []
          : [{ column: taskColumns[field], value: toInput(value) }];
      });

      if (fields.length > 0) {
        run(
          `update tasks set ${fields.map((field) => `${field.column} = ?`).join(", ")} where id = ?`,
          ...fields.map((field) => field.value),
          taskId
        );
      }

      return findTask(taskId);
    },
  };

  return store;
};
