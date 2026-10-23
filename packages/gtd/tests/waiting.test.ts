import { describe, expect, test } from "bun:test";

import { groupWaiting, planFollowUp } from "../src/index.ts";
import { makeTask } from "./fixtures.ts";

const today = "2026-10-23";

describe("waiting for", () => {
  test("splits items whose follow-up date has come from the rest", () => {
    const groups = groupWaiting(
      [
        makeTask({ followUpOn: "2026-10-27", id: "later", list: "waiting" }),
        makeTask({ followUpOn: "2026-10-21", id: "due", list: "waiting" }),
        makeTask({ followUpOn: "2026-10-23", id: "today", list: "waiting" }),
        makeTask({ id: "undated", list: "waiting" }),
      ],
      today
    );

    expect(groups.due.map((task) => task.id)).toEqual(["due", "today"]);
    expect(groups.later.map((task) => task.id)).toEqual(["later", "undated"]);
  });

  test("plans the chase as the user's own next action", () => {
    expect(
      planFollowUp(
        makeTask({
          list: "waiting",
          title: "Final budget numbers",
          waitingOn: "Eric",
        }),
        today
      )
    ).toEqual({
      actionTitle: "Follow up with Eric about final budget numbers",
      nextFollowUpOn: "2026-10-26",
    });
  });

  test("keeps acronyms intact in the follow-up title", () => {
    expect(
      planFollowUp(
        makeTask({ title: "PDF of the contract", waitingOn: "Ana" }),
        today
      ).actionTitle
    ).toBe("Follow up with Ana about PDF of the contract");
  });
});
