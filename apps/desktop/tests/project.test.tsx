import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "./harness.tsx";

const projectId = "prepare-presentation";

const openProject = () => renderApp({ kind: "project", projectId });

const main = () => within(screen.getByRole("main"));

const section = (name: string) => within(main().getByRole("region", { name }));

const headingTitles = (store: ReturnType<typeof renderApp>["store"]) =>
  store.getProject(projectId)?.headings.map((heading) => heading.title);

describe("a project", () => {
  it("groups its to-dos under headings, with Waiting For apart", async () => {
    openProject();

    await main().findByRole("heading", { level: 2, name: "Slides and notes" });

    expect(
      section("Slides and notes").getByText("Draft slide outline")
    ).toBeDefined();
    expect(
      section("Slides and notes").queryByText("Call Diane about venue")
    ).toBeNull();
    expect(
      section("Preparation").getByText("Call Diane about venue")
    ).toBeDefined();
  });

  it("lists what it waits on, with who owes it and when to chase", async () => {
    openProject();

    await main().findByRole("heading", { level: 2, name: "Waiting for" });

    const waiting = section("Waiting for");

    expect(waiting.getByText("Olivia: quarterly data export")).toBeDefined();
    expect(waiting.getByText("Follow up Wed")).toBeDefined();
    expect(waiting.getAllByText("Asked Oct 23")).toHaveLength(2);
  });

  it("shows its area, deadline, progress, notes and outcome", async () => {
    openProject();

    await expect(main().findByText("6 of 15 done")).resolves.toBeDefined();
    expect(main().getByText("Work")).toBeDefined();
    expect(main().getByText("Deadline Nov 6")).toBeDefined();
    expect(main().getByText(/^Keep the talk and slides simple/u)).toBeDefined();
    expect(main().getByText("DONE WHEN")).toBeDefined();
  });

  it("keeps to-dos ticked today in place, and older ones behind a toggle", async () => {
    openProject();

    const tickedToday = await main().findByRole("checkbox", {
      name: "Complete Revise introduction",
    });

    expect(tickedToday.getAttribute("aria-checked")).toBe("true");
    expect(main().queryByText("Reserve the auditorium")).toBeNull();

    const user = userEvent.setup();

    await user.click(
      main().getByRole("button", { name: "Show 4 completed to-dos" })
    );

    expect(main().getByText("Reserve the auditorium")).toBeDefined();
    expect(
      main().getByRole("button", { name: "Hide 4 completed to-dos" })
    ).toBeDefined();
  });

  it("a to-do ticked now stays where it is", async () => {
    const { store } = openProject();
    const user = userEvent.setup();

    await user.click(
      await main().findByRole("checkbox", {
        name: "Complete Simplify slide layouts",
      })
    );

    await expect(main().findByText("7 of 15 done")).resolves.toBeDefined();
    expect(
      section("Slides and notes").getByText("Simplify slide layouts")
    ).toBeDefined();
    expect(
      store
        .getProject(projectId)
        ?.tasks.find((task) => task.title === "Simplify slide layouts")
        ?.completedAt
    ).not.toBeNull();
  });

  it("the toolbar adds a heading and names it in place", async () => {
    const { store } = openProject();
    const user = userEvent.setup();

    await main().findByRole("heading", { level: 2, name: "Preparation" });
    await user.click(screen.getByRole("button", { name: "New heading" }));

    const title = await main().findByRole("textbox", { name: "Heading title" });

    // In the app the placeholder title starts selected, so typing replaces
    // it. user.type clicks first, which drops the selection.
    await user.clear(title);
    await user.type(title, "Follow-ups{Enter}");

    await expect(
      main().findByRole("heading", { level: 2, name: "Follow-ups" })
    ).resolves.toBeDefined();
    expect(headingTitles(store)).toStrictEqual([
      "Slides and notes",
      "Preparation",
      "Follow-ups",
    ]);
  });

  it("renames a heading from its menu, and Escape keeps the old title", async () => {
    const { store } = openProject();
    const user = userEvent.setup();

    await user.click(
      await main().findByRole("button", { name: "Preparation options" })
    );
    await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
    await user.type(
      await main().findByRole("textbox", { name: "Heading title" }),
      "Abandoned{Escape}"
    );

    await expect(
      main().findByRole("heading", { level: 2, name: "Preparation" })
    ).resolves.toBeDefined();

    await user.click(
      main().getByRole("button", { name: "Preparation options" })
    );
    await user.click(await screen.findByRole("menuitem", { name: "Rename" }));

    const title = await main().findByRole("textbox", {
      name: "Heading title",
    });

    await user.clear(title);
    await user.type(title, "Rehearsal{Enter}");

    await expect(
      main().findByRole("heading", { level: 2, name: "Rehearsal" })
    ).resolves.toBeDefined();
    expect(headingTitles(store)).toStrictEqual([
      "Slides and notes",
      "Rehearsal",
    ]);
  });

  it("deleting a heading keeps its to-dos in the project", async () => {
    const { store } = openProject();
    const user = userEvent.setup();

    await user.click(
      await main().findByRole("button", { name: "Slides and notes options" })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Delete heading" })
    );

    await waitFor(() => {
      expect(
        main().queryByRole("heading", { level: 2, name: "Slides and notes" })
      ).toBeNull();
    });
    // They move up, to the to-dos that sit under no heading.
    expect(section("To-dos").getByText("Draft slide outline")).toBeDefined();
    expect(headingTitles(store)).toStrictEqual(["Preparation"]);
  });

  it("edits the project's notes from its menu", async () => {
    const { store } = openProject();
    const user = userEvent.setup();

    await user.click(
      await main().findByRole("button", { name: "Project options" })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Edit notes" })
    );

    const notes = await main().findByRole("textbox", { name: "Project notes" });

    await user.clear(notes);
    await user.type(notes, "Three takeaways, no more.");
    await user.tab();

    await expect(
      main().findByText("Three takeaways, no more.")
    ).resolves.toBeDefined();
    expect(store.getProject(projectId)?.project.notes).toBe(
      "Three takeaways, no more."
    );
  });
});
