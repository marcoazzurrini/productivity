import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "./harness.tsx";

const sidebar = () => screen.getByRole("navigation", { name: "Lists" });

describe("inbox and capture", () => {
  it("shows unclarified items and the way to clarify them", async () => {
    renderApp();

    await expect(
      screen.findByText("Book flights for Rome trip")
    ).resolves.toBeDefined();
    expect(
      screen.getByRole("region", { name: "7 items to clarify" })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Start clarifying/u })
    ).toBeDefined();
  });

  it("⌘N captures straight into the inbox", async () => {
    const { store } = renderApp();
    const user = userEvent.setup();

    await screen.findByText("Book flights for Rome trip");
    await user.keyboard("{Meta>}n{/Meta}");
    await user.type(
      await screen.findByRole("textbox", { name: "What's on your mind?" }),
      "Buy birthday card{Enter}"
    );

    await expect(screen.findByText("Buy birthday card")).resolves.toBeDefined();
    expect(store.listInbox().map((task) => task.title)).toContain(
      "Buy birthday card"
    );
  });

  it("a capture with a context skips the inbox", async () => {
    const { store } = renderApp();
    const user = userEvent.setup();

    await screen.findByText("Book flights for Rome trip");
    await user.keyboard("{Meta>}n{/Meta}");

    const dialog = await screen.findByRole("dialog", { name: "Capture" });

    await user.type(
      within(dialog).getByRole("textbox", { name: "What's on your mind?" }),
      "Call the florist"
    );
    await user.click(within(dialog).getByRole("button", { name: "Context" }));
    await user.click(await screen.findByRole("menuitem", { name: "@Calls" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await expect(
      screen.findByText("Added to Next Actions")
    ).resolves.toBeDefined();

    const action = store
      .listNextActions()
      .find((task) => task.title === "Call the florist");

    expect(action?.contextId).toBe("calls");
    expect(store.listInbox()).toHaveLength(7);
  });

  it("a capture from a project's page goes to that project", async () => {
    const { store } = renderApp({
      kind: "project",
      projectId: "prepare-presentation",
    });

    const user = userEvent.setup();

    await screen.findByRole("heading", { name: "Prepare Presentation" });
    await user.keyboard("{Meta>}n{/Meta}");

    const dialog = await screen.findByRole("dialog", { name: "Capture" });

    await user.type(
      within(dialog).getByRole("textbox", { name: "What's on your mind?" }),
      "Book the meeting room{Enter}"
    );

    await expect(
      screen.findByText("Added to Prepare Presentation")
    ).resolves.toBeDefined();
    expect(
      store.getProject("prepare-presentation")?.tasks.map((task) => task.title)
    ).toContain("Book the meeting room");
  });
});

describe("clarify", () => {
  it("turns the oldest inbox item into a next action", async () => {
    const { store } = renderApp({ kind: "clarify", taskId: null });
    const user = userEvent.setup();

    await expect(
      screen.findByRole("heading", { name: "Book flights for Rome trip" })
    ).resolves.toBeDefined();

    await user.click(screen.getByText("Yes"));
    await user.clear(screen.getByRole("textbox", { name: "Next action" }));
    await user.type(
      screen.getByRole("textbox", { name: "Next action" }),
      "Compare fares{Enter}"
    );
    await user.click(screen.getByText("No, it takes longer"));
    await user.click(screen.getByText("No, just this action"));
    await user.click(screen.getByText("Me"));
    await user.click(screen.getByRole("button", { name: "Save action" }));

    await expect(
      screen.findByText('Added "Compare fares" to Next Actions')
    ).resolves.toBeDefined();
    expect(store.listNextActions().map((task) => task.title)).toContain(
      "Compare fares"
    );
    expect(store.listInbox()).toHaveLength(6);
  });

  it("sends a non-actionable item to Someday with number keys", async () => {
    const { store } = renderApp({ kind: "clarify", taskId: null });
    const user = userEvent.setup();

    await screen.findByRole("heading", { name: "Book flights for Rome trip" });
    await user.keyboard("2");
    await user.keyboard("2");

    await waitFor(() => {
      expect(store.listSomeday().map((task) => task.title)).toContain(
        "Book flights for Rome trip"
      );
    });
  });

  it("Change reopens an answered question", async () => {
    renderApp({ kind: "clarify", taskId: null });
    const user = userEvent.setup();

    await screen.findByRole("heading", { name: "Book flights for Rome trip" });
    await user.click(screen.getByText("Yes"));
    await user.click(screen.getByRole("button", { name: "Change" }));

    expect(
      screen.getByRole("heading", { name: "Is it actionable?" })
    ).toBeDefined();
  });

  it("Continue adds the action to the picked project", async () => {
    renderApp({ kind: "clarify", taskId: null });
    const user = userEvent.setup();

    await screen.findByRole("heading", { name: "Book flights for Rome trip" });
    await user.keyboard("1");
    await user.type(
      screen.getByRole("textbox", { name: "Next action" }),
      "{Enter}"
    );
    await user.keyboard("2");
    // No Continue yet: the question's choices answer on their own.
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    await user.keyboard("2");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByRole("heading", { name: "Who will do it?" })
    ).toBeDefined();
    expect(
      within(screen.getByRole("list", { name: "Questions" })).getByText(
        "Prepare Presentation"
      )
    ).toBeDefined();
  });
});

describe("waiting for", () => {
  it("follow up adds the chase to Next Actions, and Undo removes it", async () => {
    const { store } = renderApp({ kind: "waiting" });
    const user = userEvent.setup();
    const due = await screen.findByRole("list", { name: "Follow up now" });
    const [first] = within(due).getAllByRole("button", { name: /Follow up/u });

    await user.click(first ?? due);

    const title = "Follow up with Eric Chen about final budget numbers";

    await expect(
      screen.findByText(`Added “${title}” to Next Actions`)
    ).resolves.toBeDefined();
    expect(store.listNextActions().map((task) => task.title)).toContain(title);

    await user.click(screen.getByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(store.listNextActions().map((task) => task.title)).not.toContain(
        title
      );
    });
  });
});

describe("next actions", () => {
  it("a context in the sidebar shows only that context's actions", async () => {
    renderApp({ contextId: null, kind: "next" });
    const user = userEvent.setup();

    await screen.findByText("Draft slide outline");
    await user.click(
      within(sidebar()).getByRole("button", { name: /@Calls/u })
    );

    await expect(
      screen.findByRole("heading", { level: 1, name: "@Calls" })
    ).resolves.toBeDefined();
    const list = within(screen.getByRole("main"));

    expect(list.getByText("Call Diane about venue")).toBeDefined();
    expect(list.queryByText("Draft slide outline")).toBeNull();
  });

  it("ticking an action completes it", async () => {
    const { store } = renderApp({ contextId: null, kind: "next" });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("checkbox", {
        name: "Complete Sort the tax papers",
      })
    );

    await waitFor(() => {
      expect(store.listNextActions().map((task) => task.title)).not.toContain(
        "Sort the tax papers"
      );
    });
  });

  it("a click selects an action, and a double click opens it", async () => {
    renderApp({ contextId: null, kind: "next" });
    const user = userEvent.setup();

    const title = await screen.findByRole("button", {
      name: "Sort the tax papers",
    });

    await user.click(title);

    expect(title.closest("li")?.getAttribute("aria-current")).toBe("true");
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.dblClick(title);

    await expect(screen.findByRole("dialog")).resolves.toBeDefined();
  });

  it("a section's menu narrows the list to that context", async () => {
    renderApp({ contextId: null, kind: "next" });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "@Calls options" })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Show only @Calls" })
    );

    await expect(
      screen.findByRole("heading", { level: 1, name: "@Calls" })
    ).resolves.toBeDefined();
  });
});

describe("weekly review", () => {
  it("shows what each list holds, and opens it", async () => {
    renderApp({ kind: "review" });
    const user = userEvent.setup();

    const inboxTitle = await screen.findByText("Clarify the Inbox to zero");
    const inbox = inboxTitle.closest("li");

    await expect(
      within(inbox ?? document.body).findByText("7 left")
    ).resolves.toBeDefined();

    const waiting = screen.getByText("Review Waiting For").closest("li");

    expect(
      within(waiting ?? document.body).getByText("2 to follow up")
    ).toBeDefined();

    await user.click(
      within(waiting ?? document.body).getByRole("button", { name: "Open" })
    );

    await expect(
      screen.findByRole("heading", { level: 1, name: "Waiting For" })
    ).resolves.toBeDefined();
  });

  it("a phase's menu ticks all of its steps", async () => {
    const { store } = renderApp({ kind: "review" });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Get creative options" })
    );
    await user.click(await screen.findByRole("menuitem", { name: "Tick all" }));

    await waitFor(() => {
      expect(store.getReview().checked.toSorted()).toStrictEqual([
        "be-creative",
        "someday",
      ]);
    });
    expect(screen.getByText("2 of 2")).toBeDefined();
  });

  it("ticking steps and finishing records the review", async () => {
    const { store } = renderApp({ kind: "review" });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("checkbox", {
        name: "Collect loose papers and notes",
      })
    );
    await waitFor(() => {
      expect(store.getReview().checked).toStrictEqual(["collect"]);
    });
    await user.click(screen.getByRole("button", { name: "Finish review" }));

    await waitFor(() => {
      expect(store.getReview().lastReviewedOn).toBe("2026-10-23");
    });
  });
});

describe("theme", () => {
  it("follows the system until you pick light or dark", async () => {
    const { appearance } = renderApp();
    const user = userEvent.setup();
    const theme = await screen.findByRole("group", { name: "Theme" });

    await waitFor(() => {
      expect(
        within(theme)
          .getByRole("button", { name: "Match the system" })
          .getAttribute("aria-pressed")
      ).toBe("true");
    });

    await user.click(within(theme).getByRole("button", { name: "Dark" }));

    await waitFor(() => {
      expect(appearance.theme).toBe("dark");
    });
    expect(
      within(theme)
        .getByRole("button", { name: "Dark" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });
});
