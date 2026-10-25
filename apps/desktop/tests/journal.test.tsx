import { EditorView } from "@codemirror/view";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "./harness.tsx";

const today = "2026-10-23";

const sidebar = () => screen.getByRole("navigation", { name: "Lists" });

/** The CodeMirror editor behind a day's page. */
const editorFor = async (date: string): Promise<EditorView> => {
  const content = await screen.findByRole("textbox", {
    name: `Journal for ${date}`,
  });

  const view = EditorView.findFromDOM(content);

  if (view === null) {
    throw new Error("The journal is not a CodeMirror editor.");
  }

  return view;
};

/** Types at the end of the page, as a keystroke would. */
const typeInto = (view: EditorView, text: string): void => {
  view.dispatch({
    changes: { from: view.state.doc.length, insert: text },
    userEvent: "input.type",
  });
};

describe("journal", () => {
  it("opens today's page from the sidebar", async () => {
    renderApp();
    const user = userEvent.setup();

    await user.click(
      within(sidebar()).getByRole("button", { name: /Journal/u })
    );

    await expect(
      screen.findByRole("heading", { level: 1, name: "Friday, October 23" })
    ).resolves.toBeDefined();
    expect(screen.getByText(/New page/u)).toBeDefined();
  });

  it("⌘J opens today's page from anywhere", async () => {
    renderApp();
    const user = userEvent.setup();

    await screen.findByRole("heading", { level: 1, name: "Inbox" });
    await user.keyboard("{Meta>}j{/Meta}");

    await expect(
      screen.findByRole("heading", { level: 1, name: "Friday, October 23" })
    ).resolves.toBeDefined();
  });

  it("saves what you write once you pause", async () => {
    const { store } = renderApp({ day: today, kind: "journal" });

    typeInto(await editorFor("Friday, October 23"), "Slept well");

    await waitFor(() => {
      expect(store.journal.read(today).markdown).toBe("Slept well");
    });
    expect(screen.getByText(/2 words/u)).toBeDefined();
    expect(screen.getByText("Saved")).toBeDefined();
  });

  it("keeps the text when you leave before it saved", async () => {
    const { store } = renderApp({ day: today, kind: "journal" });
    const user = userEvent.setup();

    typeInto(await editorFor("Friday, October 23"), "Left at once");
    await user.click(within(sidebar()).getByRole("button", { name: /Inbox/u }));

    await waitFor(() => {
      expect(store.journal.read(today).markdown).toBe("Left at once");
    });

    await user.click(
      within(sidebar()).getByRole("button", { name: /Journal/u })
    );

    const view = await editorFor("Friday, October 23");

    expect(view.state.doc.toString()).toBe("Left at once");
  });

  it("opens the page already written for a day", async () => {
    renderApp({ day: today, kind: "journal" }, (store) => {
      store.journal.write(today, "## Morning\n\nSlept well");
    });

    const view = await editorFor("Friday, October 23");

    expect(view.state.doc.toString()).toBe("## Morning\n\nSlept well");
    expect(screen.getByText(/3 words/u)).toBeDefined();
  });

  it("keeps each day on its own page", async () => {
    const { store } = renderApp({ day: today, kind: "journal" });
    const user = userEvent.setup();

    typeInto(await editorFor("Friday, October 23"), "Friday");
    await user.click(
      within(screen.getByRole("main")).getByRole("button", {
        name: "Previous day",
      })
    );
    typeInto(await editorFor("Thursday, October 22"), "Thursday");
    await user.click(
      within(screen.getByRole("main")).getByRole("button", { name: "Today" })
    );

    await waitFor(() => {
      expect(store.journal.read("2026-10-22").markdown).toBe("Thursday");
    });
    expect(store.journal.read(today).markdown).toBe("Friday");

    const back = await editorFor("Friday, October 23");

    expect(back.state.doc.toString()).toBe("Friday");
  });

  it("ticks a to-do on the page", async () => {
    const { store } = renderApp({ day: today, kind: "journal" }, (prepared) => {
      // The cursor opens on the last line, which shows raw Markdown.
      prepared.journal.write(today, "- [ ] Call Diane\n");
    });

    const user = userEvent.setup();

    await editorFor("Friday, October 23");
    await user.click(screen.getByRole("checkbox", { name: "To do" }));

    await waitFor(() => {
      expect(store.journal.read(today).markdown).toBe("- [x] Call Diane\n");
    });
  });
});
