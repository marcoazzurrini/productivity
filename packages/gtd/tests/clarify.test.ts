import { describe, expect, test } from "bun:test";

import { clarifyOutcome, clarifyProgress, reopenStep } from "../src/index.ts";
import type { WhenAnswer } from "../src/index.ts";

const anytime: WhenAnswer = {
  contextId: "computer",
  deadline: null,
  energy: "low",
  minutes: 15,
  startOn: null,
};

describe("clarify", () => {
  test("starts by asking whether the item is actionable", () => {
    expect(clarifyProgress({})).toEqual({
      answered: [],
      current: "actionable",
      remaining: ["nextAction", "twoMinutes", "project", "owner", "when"],
    });
  });

  test("sends non-actionable items to the chosen place", () => {
    expect(clarifyProgress({ actionable: false }).current).toBe("disposal");
    expect(clarifyOutcome({ actionable: false, disposal: "someday" })).toEqual({
      kind: "someday",
    });
  });

  test("treats a two-minute action as done on the spot", () => {
    const answers = {
      actionable: true,
      nextAction: "Reply yes",
      underTwoMinutes: true,
    };

    expect(clarifyProgress(answers).current).toBeNull();
    expect(clarifyOutcome(answers)).toEqual({ kind: "done" });
  });

  test("ignores a blank next action", () => {
    expect(
      clarifyProgress({ actionable: true, nextAction: "   " }).current
    ).toBe("nextAction");
  });

  test("skips the when question for delegated actions", () => {
    const answers = {
      actionable: true,
      nextAction: "Get quote from plumber",
      owner: {
        followUpOn: "2026-10-27",
        kind: "delegate",
        person: "Mario",
      } as const,
      project: { kind: "none" } as const,
      underTwoMinutes: false,
    };

    expect(clarifyProgress(answers).current).toBeNull();
    expect(clarifyOutcome(answers)).toMatchObject({
      kind: "action",
      owner: { kind: "delegate" },
    });
  });

  test("returns a full action once every question is answered", () => {
    expect(
      clarifyOutcome({
        actionable: true,
        nextAction: "  Compare fares  ",
        owner: { kind: "me" },
        project: { kind: "existing", projectId: "rome" },
        underTwoMinutes: false,
        when: anytime,
      })
    ).toEqual({
      kind: "action",
      owner: { kind: "me" },
      project: { kind: "existing", projectId: "rome" },
      title: "Compare fares",
      when: anytime,
    });
  });

  test("returns null while questions remain", () => {
    expect(clarifyOutcome({ actionable: true })).toBeNull();
  });

  test("reopening a step clears it and every later answer", () => {
    const reopened = reopenStep(
      {
        actionable: true,
        nextAction: "Compare fares",
        owner: { kind: "me" },
        project: { kind: "none" },
        underTwoMinutes: false,
      },
      "twoMinutes"
    );

    expect(reopened).toEqual({
      actionable: true,
      disposal: undefined,
      nextAction: "Compare fares",
      owner: undefined,
      project: undefined,
      underTwoMinutes: undefined,
      when: undefined,
    });
  });
});
