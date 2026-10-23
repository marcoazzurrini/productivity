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
    await user.click(screen.getByText("No, it stands alone"));
    await user.click(screen.getByText("I will"));
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
      screen.findByText(`Added "${title}" to Next Actions`)
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
});

describe("weekly review", () => {
  it("ticking steps and finishing records the review", async () => {
    const { store } = renderApp({ kind: "review" });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("checkbox", {
        name: "Collect loose papers and materials",
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
