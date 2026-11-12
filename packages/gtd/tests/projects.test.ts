import { describe, expect, test } from "bun:test";

import { groupProjectTasks } from "../src/index.ts";
import type { Heading } from "../src/index.ts";
import { makeTask } from "./fixtures.ts";

const today = "2026-10-23";

const slides: Heading = { id: "slides", projectId: "talk", title: "Slides" };
const prep: Heading = { id: "prep", projectId: "talk", title: "Preparation" };

const titles = (tasks: { title: string }[]): string[] =>
  tasks.map((task) => task.title);

describe("a project's to-dos", () => {
  test("sit under their headings, with heading-less ones first", () => {
    const groups = groupProjectTasks(
      [
        makeTask({ headingId: "prep", title: "Call the venue" }),
        makeTask({ title: "Loose end" }),
        makeTask({ headingId: "slides", title: "Draft outline" }),
      ],
      [slides, prep],
      today
    );

    expect(
      groups.sections.map((section) => [
        section.heading?.title ?? null,
        titles(section.tasks),
      ])
    ).toEqual([
      [null, ["Loose end"]],
      ["Slides", ["Draft outline"]],
      ["Preparation", ["Call the venue"]],
    ]);
  });

  test("an empty heading keeps its section, and no heading-less section is made up", () => {
    const groups = groupProjectTasks([], [slides], today);

    expect(groups.sections).toEqual([{ heading: slides, tasks: [] }]);
  });

  test("a to-do under a heading that is gone counts as heading-less", () => {
    const groups = groupProjectTasks(
      [makeTask({ headingId: "deleted", title: "Orphan" })],
      [slides],
      today
    );

    expect(titles(groups.sections[0]?.tasks ?? [])).toEqual(["Orphan"]);
    expect(groups.sections[0]?.heading).toBeNull();
  });

  test("to-dos ticked today stay in place after the open ones; older ones step aside", () => {
    const groups = groupProjectTasks(
      [
        makeTask({
          completedAt: "2026-10-23T09:00",
          headingId: "slides",
          title: "Ticked today",
        }),
        makeTask({ headingId: "slides", title: "Still open" }),
        makeTask({
          completedAt: "2026-10-20T17:00",
          headingId: "slides",
          title: "Ticked on Monday",
        }),
      ],
      [slides],
      today
    );

    expect(titles(groups.sections[0]?.tasks ?? [])).toEqual([
      "Still open",
      "Ticked today",
    ]);
    expect(titles(groups.earlier)).toEqual(["Ticked on Monday"]);
    expect(groups.doneCount).toBe(2);
    expect(groups.totalCount).toBe(3);
  });

  test("Waiting For items are kept apart from the project's own actions", () => {
    const groups = groupProjectTasks(
      [
        makeTask({
          list: "waiting",
          title: "Data export",
          waitingOn: "Olivia",
        }),
        makeTask({ title: "Draft outline" }),
      ],
      [],
      today
    );

    expect(titles(groups.waiting)).toEqual(["Data export"]);
    expect(titles(groups.sections[0]?.tasks ?? [])).toEqual(["Draft outline"]);
  });
});
