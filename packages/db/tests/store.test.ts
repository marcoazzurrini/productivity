import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { NotFoundError, openStore } from "../src/index.ts";
import type { Store } from "../src/index.ts";
import { fixedNow, memoryStore } from "./helpers.ts";

let store: Store;

afterEach(() => {
  store.close();
});

const anytime = {
  contextId: "computer",
  deadline: null,
  energy: "low",
  minutes: 15,
  startOn: null,
} as const;

describe("a new database", () => {
  test("starts with the default contexts and an empty inbox", () => {
    store = memoryStore();

    expect(store.listContexts().map((context) => context.name)).toEqual([
      "@Computer",
      "@Calls",
      "@Errands",
      "@Home",
      "@Office",
    ]);
    expect(store.listInbox()).toEqual([]);
  });

  test("keeps data across reopening and migrates only once", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "productivity-"));
    const file = path.join(directory, "gtd.sqlite");

    store = openStore({ clock: () => fixedNow, path: file });
    store.capture({ title: "Remember me" });
    store.close();

    store = openStore({ clock: () => fixedNow, path: file });

    expect(store.listInbox().map((task) => task.title)).toEqual([
      "Remember me",
    ]);
    expect(store.listContexts()).toHaveLength(5);

    store.close();
    rmSync(directory, { force: true, recursive: true });
    store = memoryStore();
  });
});

describe("capture and clarify", () => {
  test("captures into the inbox with a trimmed title and a timestamp", () => {
    store = memoryStore();

    const task = store.capture({ source: "mail", title: "  Book flights  " });

    expect(task).toMatchObject({
      capturedAt: "2026-10-23T14:40",
      list: "inbox",
      source: "mail",
      title: "Book flights",
    });
    expect(store.overview().inbox).toBe(1);
  });

  test("refuses an empty capture", () => {
    store = memoryStore();

    expect(() => store.capture({ title: "   " })).toThrow(RangeError);
  });

  test("trash deletes, someday parks, done completes", () => {
    store = memoryStore();

    const trash = store.capture({ title: "Spam" });
    const idea = store.capture({ title: "Learn Italian" });
    const quick = store.capture({ title: "Reply yes" });

    store.clarify(trash.id, { kind: "trash" });
    store.clarify(idea.id, { kind: "someday" });
    store.clarify(quick.id, { kind: "done" });

    expect(store.listInbox()).toEqual([]);
    expect(store.listSomeday().map((task) => task.title)).toEqual([
      "Learn Italian",
    ]);
    expect(store.listNextActions()).toEqual([]);
  });

  test("an action for me becomes a next action with its context", () => {
    store = memoryStore();

    const item = store.capture({ title: "Rome trip flights" });

    store.clarify(item.id, {
      kind: "action",
      owner: { kind: "me" },
      project: {
        kind: "new",
        name: "Vacation in Rome",
        outcome: "Trip booked",
      },
      title: "Compare fares",
      when: anytime,
    });

    const [action] = store.listNextActions();
    const projects = store.listProjects();

    expect(action).toMatchObject({
      contextId: "computer",
      list: "next",
      minutes: 15,
      title: "Compare fares",
    });
    expect(projects).toMatchObject([
      { name: "Vacation in Rome", openCount: 1, outcome: "Trip booked" },
    ]);
    expect(action?.projectId).toBe(projects[0]?.id ?? "missing");
  });

  test("a delegated action goes to Waiting For with a follow-up date", () => {
    store = memoryStore();

    const item = store.capture({ title: "Plumber quote" });

    store.clarify(item.id, {
      kind: "action",
      owner: { followUpOn: "2026-10-27", kind: "delegate", person: "Mario" },
      project: { kind: "none" },
      title: "Get a quote for the boiler",
      when: anytime,
    });

    expect(store.listWaiting()).toMatchObject([
      {
        contextId: null,
        followUpOn: "2026-10-27",
        list: "waiting",
        waitingOn: "Mario",
      },
    ]);
  });

  test("clarifying an unknown item fails loudly", () => {
    store = memoryStore();

    expect(() => store.clarify("nope", { kind: "trash" })).toThrow(
      NotFoundError
    );
  });
});

describe("lists", () => {
  test("deferred actions wait in Upcoming until their start day", () => {
    store = memoryStore();

    const task = store.capture({ title: "Renew insurance" });

    store.clarify(task.id, {
      kind: "action",
      owner: { kind: "me" },
      project: { kind: "none" },
      title: "Renew insurance",
      when: { ...anytime, startOn: "2026-10-28" },
    });

    expect(store.listNextActions()).toEqual([]);
    expect(store.listUpcoming().map((upcoming) => upcoming.title)).toEqual([
      "Renew insurance",
    ]);
  });

  test("following up creates a next action and pushes the follow-up date", () => {
    store = memoryStore(true);

    const budget = store
      .listWaiting()
      .find((task) => task.title === "Final budget numbers");

    const action = store.followUp(budget?.id ?? "");

    expect(action).toMatchObject({
      list: "next",
      projectId: "q4-planning",
      title: "Follow up with Eric Chen about final budget numbers",
    });
    expect(
      store.listWaiting().find((task) => task.id === budget?.id)?.followUpOn
    ).toBe("2026-10-26");
  });

  test("only Waiting For items can be followed up", () => {
    store = memoryStore();

    const task = store.capture({ title: "Inbox item" });

    expect(() => store.followUp(task.id)).toThrow(RangeError);
  });

  test("editing a task changes only the given fields", () => {
    store = memoryStore();

    const task = store.capture({ notes: "keep", title: "Draft" });

    const updated = store.updateTask(task.id, {
      deadline: "2026-10-30",
      starred: true,
    });

    expect(updated).toMatchObject({
      deadline: "2026-10-30",
      notes: "keep",
      starred: true,
      title: "Draft",
    });
  });

  test("completing and reopening toggles the completion time", () => {
    store = memoryStore();

    const task = store.capture({ title: "Done soon" });

    expect(store.setCompleted(task.id, true).completedAt).toBe(
      "2026-10-23T14:40"
    );
    expect(store.setCompleted(task.id, false).completedAt).toBeNull();
  });
});

describe("sample data", () => {
  test("matches the design's counts", () => {
    store = memoryStore(true);

    expect(store.overview()).toMatchObject({
      inbox: 7,
      nextActions: 17,
      someday: 4,
      waiting: 5,
      waitingDue: 2,
    });
    expect(store.listProjects().map((project) => project.name)).toEqual([
      "Prepare Presentation",
      "Onboard James",
      "Q4 Planning",
      "Vacation in Rome",
      "Buy a New Car",
    ]);
  });

  test("the week holds time-blocked tasks", () => {
    store = memoryStore(true);

    const week = store.getWeek("2026-10-23");

    expect(week.days[0]).toBe("2026-10-19");
    expect(week.blocks.map((task) => task.title)).toEqual([
      "Draft slide outline",
      "Call Diane about venue",
      "Pick up dry cleaning",
      "Read chapter 4 of Getting Things Done",
    ]);
  });
});

const newProject = (): string =>
  store.createProject({
    areaId: null,
    deadline: null,
    name: "Prepare Presentation",
    outcome: "Deck shared",
  }).id;

const actionIn = (projectId: string, title: string): string => {
  const item = store.capture({ title });

  store.clarify(item.id, {
    kind: "action",
    owner: { kind: "me" },
    project: { kind: "existing", projectId },
    title,
    when: anytime,
  });

  return item.id;
};

describe("projects and headings", () => {
  test("headings keep the order they were added in, with trimmed titles", () => {
    store = memoryStore();

    const projectId = newProject();

    store.createHeading(projectId, "  Slides  ");
    store.createHeading(projectId, "Preparation");

    expect(
      store.getProject(projectId)?.headings.map((heading) => heading.title)
    ).toEqual(["Slides", "Preparation"]);
  });

  test("a heading needs a title and a project", () => {
    store = memoryStore();

    const projectId = newProject();
    const heading = store.createHeading(projectId, "Slides");

    expect(() => store.createHeading(projectId, "   ")).toThrow(RangeError);
    expect(() => store.renameHeading(heading.id, "")).toThrow(RangeError);
    expect(() => store.createHeading("missing", "Slides")).toThrow(
      NotFoundError
    );
    expect(() => store.renameHeading("missing", "Slides")).toThrow(
      NotFoundError
    );
  });

  test("renaming a heading keeps its to-dos under it", () => {
    store = memoryStore();

    const projectId = newProject();
    const heading = store.createHeading(projectId, "Slides");
    const taskId = actionIn(projectId, "Draft outline");

    store.updateTask(taskId, { headingId: heading.id });

    expect(store.renameHeading(heading.id, "Slides and notes")).toEqual({
      id: heading.id,
      projectId,
      title: "Slides and notes",
    });
    expect(store.getProject(projectId)?.tasks[0]?.headingId).toBe(heading.id);
  });

  test("deleting a heading keeps its to-dos in the project", () => {
    store = memoryStore();

    const projectId = newProject();
    const heading = store.createHeading(projectId, "Slides");
    const taskId = actionIn(projectId, "Draft outline");

    store.updateTask(taskId, { headingId: heading.id });
    store.deleteHeading(heading.id);

    const detail = store.getProject(projectId);

    expect(detail?.headings).toEqual([]);
    expect(detail?.tasks).toMatchObject([
      { headingId: null, id: taskId, projectId },
    ]);
  });

  test("a to-do that moves to another project leaves its heading", () => {
    store = memoryStore();

    const projectId = newProject();
    const heading = store.createHeading(projectId, "Slides");
    const taskId = actionIn(projectId, "Draft outline");

    const other = store.createProject({
      areaId: null,
      deadline: null,
      name: "Q4 Planning",
      outcome: "",
    });

    store.updateTask(taskId, { headingId: heading.id });

    // Other edits leave the heading alone.
    expect(store.updateTask(taskId, { starred: true }).headingId).toBe(
      heading.id
    );
    expect(store.updateTask(taskId, { projectId: other.id })).toMatchObject({
      headingId: null,
      projectId: other.id,
    });
  });

  test("a to-do only goes under a heading of its own project", () => {
    store = memoryStore();

    const projectId = newProject();

    const other = store.createProject({
      areaId: null,
      deadline: null,
      name: "Q4 Planning",
      outcome: "",
    });

    const foreign = store.createHeading(other.id, "Budget");
    const taskId = actionIn(projectId, "Draft outline");

    expect(() => store.updateTask(taskId, { headingId: foreign.id })).toThrow(
      RangeError
    );
    expect(() => store.updateTask(taskId, { headingId: "missing" })).toThrow(
      NotFoundError
    );
    // Moving project and heading together is one valid change.
    expect(
      store.updateTask(taskId, { headingId: foreign.id, projectId: other.id })
    ).toMatchObject({ headingId: foreign.id, projectId: other.id });
  });

  test("a project's notes can be edited, and nothing else changes", () => {
    store = memoryStore();

    const projectId = newProject();

    expect(store.getProject(projectId)?.project.notes).toBe("");
    expect(
      store.updateProject(projectId, { notes: "Keep it simple." })
    ).toMatchObject({
      name: "Prepare Presentation",
      notes: "Keep it simple.",
      outcome: "Deck shared",
    });
    expect(() => store.updateProject("missing", { notes: "" })).toThrow(
      NotFoundError
    );
  });

  test("the sample project has the design's headings", () => {
    store = memoryStore(true);

    const detail = store.getProject("prepare-presentation");

    expect(detail?.headings.map((heading) => heading.title)).toEqual([
      "Slides and notes",
      "Preparation",
    ]);
    expect(
      detail?.tasks
        .filter((task) => task.headingId === "slides-and-notes")
        .map((task) => task.title)
    ).toEqual([
      "Draft slide outline",
      "Simplify slide layouts",
      "Review quarterly data with Olivia",
      "Print handouts for attendees",
    ]);
    expect(
      detail?.tasks.filter((task) => task.completedAt !== null)
    ).toHaveLength(6);
  });
});

describe("calendar and review", () => {
  test("scheduling a block puts a task on the week and null removes it", () => {
    store = memoryStore();

    const task = store.capture({ title: "Write report" });

    store.scheduleBlock(task.id, {
      end: "2026-10-24T11:00",
      start: "2026-10-24T10:00",
    });
    expect(store.getWeek("2026-10-24").blocks.map((block) => block.id)).toEqual(
      [task.id]
    );

    store.scheduleBlock(task.id, null);
    expect(store.getWeek("2026-10-24").blocks).toEqual([]);
  });

  test("the review remembers ticked steps until it is finished", () => {
    store = memoryStore();

    store.setReviewStep("collect", true);
    store.setReviewStep("inbox", true);
    store.setReviewStep("inbox", false);

    expect(store.getReview()).toEqual({
      checked: ["collect"],
      lastReviewedOn: null,
    });
    expect(store.overview().review.due).toBe(true);

    store.finishReview();

    expect(store.getReview()).toEqual({
      checked: [],
      lastReviewedOn: "2026-10-23",
    });
    expect(store.overview().review).toEqual({
      due: false,
      dueOn: "2026-10-23",
    });
  });
});

describe("ordering", () => {
  test("items captured in the same minute keep their capture order", () => {
    store = memoryStore();

    store.capture({ title: "First" });
    store.capture({ title: "Second" });
    store.capture({ title: "Third" });

    expect(store.listInbox().map((task) => task.title)).toEqual([
      "Third",
      "Second",
      "First",
    ]);
  });
});
