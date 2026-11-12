import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { renderApp } from "./harness.tsx";

const sidebar = () => screen.getByRole("navigation", { name: "Lists" });
const main = () => screen.getByRole("main");

const toolbar = () =>
  within(main()).getByRole("toolbar", { name: "To-do actions" });

/** The row of a to-do, which is marked while the to-do is selected. */
const rowOf = (title: string): HTMLElement => {
  const row = within(main()).getByText(title).closest("li");

  if (row === null) {
    throw new Error(`No row for ${title}.`);
  }

  return row;
};

describe("week pane", () => {
  // The choice is saved, and this test must not hide the week for the next.
  afterEach(() => {
    localStorage.clear();
  });

  it("hides from the top bar, and stays hidden the next time", async () => {
    renderApp();

    const user = userEvent.setup();

    await screen.findByRole("complementary", { name: "Week" });
    await user.click(
      within(main()).getByRole("button", { name: "Hide calendar" })
    );

    expect(screen.queryByRole("complementary", { name: "Week" })).toBeNull();
    expect(
      within(main()).getByRole("button", { name: "Show calendar" })
    ).toBeDefined();

    // A second window reads the saved choice.
    renderApp();

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Show calendar" })
      ).toHaveLength(2);
    });
    expect(screen.queryByRole("complementary", { name: "Week" })).toBeNull();
  });
});

describe("the “…” menu", () => {
  it("starts a new project", async () => {
    renderApp();

    const user = userEvent.setup();

    await user.click(
      await within(main()).findByRole("button", { name: "More" })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "New project" })
    );

    await expect(
      screen.findByRole("dialog", { name: "New project" })
    ).resolves.toBeDefined();
  });
});

describe("quick find", () => {
  it("finds a to-do from the sidebar's search and selects it in its list", async () => {
    renderApp();

    const user = userEvent.setup();

    await user.click(
      await within(sidebar()).findByRole("button", { name: /^Quick find/u })
    );

    const field = await screen.findByRole("combobox", { name: "Quick find" });

    await user.type(field, "tax papers");
    await within(screen.getByRole("listbox", { name: "Results" })).findByRole(
      "option",
      { name: /Sort the tax papers/u }
    );
    await user.keyboard("{Enter}");

    await expect(
      screen.findByRole("heading", { level: 1, name: "Next Actions" })
    ).resolves.toBeDefined();

    await waitFor(() => {
      expect(rowOf("Sort the tax papers").getAttribute("aria-current")).toBe(
        "true"
      );
    });
  });

  it("⌘P opens it, and the arrow keys choose among places", async () => {
    renderApp();

    const user = userEvent.setup();

    await screen.findByText("Book flights for Rome trip");
    await user.keyboard("{Meta>}p{/Meta}");
    await user.type(
      await screen.findByRole("combobox", { name: "Quick find" }),
      "a"
    );

    const options = await screen.findAllByRole("option");

    expect(options[0]?.getAttribute("aria-selected")).toBe("true");

    await user.keyboard("{ArrowDown}");

    expect(
      screen.getAllByRole("option")[1]?.getAttribute("aria-selected")
    ).toBe("true");

    await user.clear(screen.getByRole("combobox", { name: "Quick find" }));
    await user.type(
      screen.getByRole("combobox", { name: "Quick find" }),
      "vacation{Enter}"
    );

    await expect(
      screen.findByRole("heading", { level: 1, name: "Vacation in Rome" })
    ).resolves.toBeDefined();
    expect(screen.queryByRole("combobox", { name: "Quick find" })).toBeNull();
  });
});

describe("main toolbar", () => {
  it("is under every page and captures a to-do", async () => {
    renderApp({ kind: "waiting" });

    const user = userEvent.setup();

    await user.click(
      await within(toolbar()).findByRole("button", { name: /^New to-do/u })
    );

    await expect(
      screen.findByRole("textbox", { name: "What's on your mind?" })
    ).resolves.toBeDefined();
  });

  it("When and Move wait for a selected to-do", async () => {
    renderApp({ contextId: null, kind: "next" });

    await screen.findByText("Sort the tax papers");

    expect(
      within(toolbar())
        .getByRole("button", { name: "When: select a to-do first" })
        .getAttribute("aria-disabled")
    ).toBe("true");
    expect(
      within(toolbar())
        .getByRole("button", { name: "Move: select a to-do first" })
        .getAttribute("aria-disabled")
    ).toBe("true");
  });

  it("Move puts the selected to-do in a project", async () => {
    const { store } = renderApp({ contextId: null, kind: "next" });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Sort the tax papers" })
    );
    await user.click(
      await within(toolbar()).findByRole("button", { name: "Move" })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Buy a New Car" })
    );

    await waitFor(() => {
      const task = store
        .listNextActions()
        .find((each) => each.title === "Sort the tax papers");

      const project = store
        .listProjects()
        .find((each) => each.name === "Buy a New Car");

      expect(task?.projectId).toBe(project?.id);
    });
  });

  it("When gives the selected to-do a start date", async () => {
    const { store } = renderApp({ contextId: null, kind: "next" });
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Sort the tax papers" })
    );
    await user.click(
      await within(toolbar()).findByRole("button", { name: "When" })
    );

    const popover = await screen.findByRole("dialog", { name: "When" });

    await user.type(within(popover).getByLabelText("Start on"), "2026-11-02");
    await user.click(within(popover).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(
        store
          .listUpcoming()
          .find((each) => each.title === "Sort the tax papers")?.startOn
      ).toBe("2026-11-02");
    });
  });

  it("leaving a list drops its selection", async () => {
    renderApp({ contextId: null, kind: "next" });

    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Sort the tax papers" })
    );
    await within(toolbar()).findByRole("button", { name: "Move" });
    await user.click(
      within(sidebar()).getByRole("button", { name: /^Inbox/u })
    );

    await expect(
      within(toolbar()).findByRole("button", {
        name: "Move: select a to-do first",
      })
    ).resolves.toBeDefined();
  });
});

describe("sidebar", () => {
  it("counts what waits without a second badge", async () => {
    renderApp();

    const waiting = await within(sidebar()).findByRole("button", {
      name: /^Waiting For/u,
    });

    await waitFor(() => {
      expect(waiting.textContent).toBe("Waiting For5");
    });
  });
});
