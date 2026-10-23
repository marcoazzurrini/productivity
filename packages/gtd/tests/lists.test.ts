import { describe, expect, test } from "bun:test";

import {
  anyNextAction,
  groupNextActions,
  isOverdue,
  upcomingDays,
} from "../src/index.ts";
import { calls, computer, makeTask } from "./fixtures.ts";

const today = "2026-10-23";

describe("groupNextActions", () => {
  const tasks = [
    makeTask({ contextId: "computer", id: "a", minutes: 60 }),
    makeTask({ contextId: "calls", energy: "high", id: "b" }),
    makeTask({ contextId: "computer", id: "c", starred: true }),
    makeTask({ id: "d" }),
    makeTask({
      completedAt: "2026-10-22T10:00",
      contextId: "computer",
      id: "done",
    }),
    makeTask({ contextId: "computer", id: "later", startOn: "2026-10-30" }),
    makeTask({ id: "waiting", list: "waiting" }),
  ];

  test("groups available actions by context with starred first and loose ones last", () => {
    const groups = groupNextActions(
      tasks,
      [computer, calls],
      anyNextAction,
      today
    );

    expect(
      groups.map((group) => [
        group.context?.id ?? null,
        group.tasks.map((task) => task.id),
      ])
    ).toEqual([
      ["computer", ["c", "a"]],
      ["calls", ["b"]],
      [null, ["d"]],
    ]);
  });

  test("filters by context, available time and energy", () => {
    const groups = groupNextActions(
      tasks,
      [computer, calls],
      { contextId: null, energy: "low", maxMinutes: 30 },
      today
    );

    expect(
      groups.flatMap((group) => group.tasks.map((task) => task.id))
    ).toEqual(["c", "d"]);
  });
});

describe("upcomingDays", () => {
  test("lists deferred starts and future deadlines by day", () => {
    const days = upcomingDays(
      [
        makeTask({ id: "start", startOn: "2026-10-28" }),
        makeTask({ deadline: "2026-10-25", id: "deadline" }),
        makeTask({ deadline: "2026-10-23", id: "today" }),
        makeTask({ id: "someday", list: "someday", startOn: "2026-10-28" }),
      ],
      today
    );

    expect(
      days.map((day) => [day.date, day.tasks.map((task) => task.id)])
    ).toEqual([
      ["2026-10-25", ["deadline"]],
      ["2026-10-28", ["start"]],
    ]);
  });
});

test("an open task past its deadline is overdue", () => {
  expect(isOverdue(makeTask({ deadline: "2026-10-22" }), today)).toBe(true);
  expect(isOverdue(makeTask({ deadline: "2026-10-23" }), today)).toBe(false);
});
