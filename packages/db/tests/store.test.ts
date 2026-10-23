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
      nextActions: 14,
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

  test("the week holds events and time-blocked tasks", () => {
    store = memoryStore(true);

    const week = store.getWeek("2026-10-23");

    expect(week.days[0]).toBe("2026-10-19");
    expect(
      week.events.filter((event) => event.allDay).map((event) => event.title)
    ).toEqual(["Q4 planning week", "Eve's birthday"]);
    expect(week.blocks.map((task) => task.title)).toEqual([
      "Draft slide outline",
      "Call Diane about venue",
      "Pick up dry cleaning",
      "Read chapter 4 of Getting Things Done",
    ]);
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

  test("events outside the week are not returned", () => {
    store = memoryStore();

    store.createEvent({
      allDay: false,
      end: "2026-10-30T10:00",
      kind: "meeting",
      start: "2026-10-30T09:00",
      title: "Next week",
    });

    expect(store.getWeek("2026-10-23").events).toEqual([]);
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
