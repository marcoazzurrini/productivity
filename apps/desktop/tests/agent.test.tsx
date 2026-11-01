import { EditorView } from "@codemirror/view";
import type { Agent, AgentMethod, ScriptStep } from "@productivity/agent";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { InvalidAgentCallError, callAgent } from "../src/main/agent-handler.ts";
import { renderApp } from "./harness.tsx";

const today = "2026-10-23";

const agentPane = () => screen.getByRole("region", { name: "Agent" });

/** Opens the agent from the page's top bar. */
const openAgent = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(
    within(screen.getByRole("main")).getByRole("button", {
      name: "Open the agent (⌘L)",
    })
  );

  return screen.findByRole("textbox", { name: "Message the agent" });
};

/** Plays each turn's steps in order, one list per turn. */
const turns =
  (...scripts: ScriptStep[][]) =>
  () =>
    scripts.shift() ?? [];

describe("the agent pane", () => {
  it("opens beside the page, and the week shrinks to one day", async () => {
    renderApp();
    const user = userEvent.setup();

    await screen.findByText("Book flights for Rome trip");
    expect(screen.getByRole("complementary", { name: "Week" })).toBeDefined();

    await openAgent(user);

    expect(screen.getByRole("complementary", { name: "Day" })).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 2, name: "Friday" })
    ).toBeDefined();

    await user.keyboard("{Meta>}l{/Meta}");

    expect(screen.queryByRole("region", { name: "Agent" })).toBeNull();
    expect(screen.getByRole("complementary", { name: "Week" })).toBeDefined();
  });

  it("sends a message with the open page, and shows the reply", async () => {
    const { runtime } = renderApp(undefined, undefined, undefined, {
      turn: turns([{ text: "You have **7** items to clarify.", type: "text" }]),
    });

    const user = userEvent.setup();

    await screen.findByText("Book flights for Rome trip");
    const input = await openAgent(user);

    expect(within(agentPane()).getByText("Inbox")).toBeDefined();

    await user.type(input, "What's in my inbox?{Enter}");

    await expect(within(agentPane()).findByText("7")).resolves.toBeDefined();
    expect(within(agentPane()).getByText("What's in my inbox?")).toBeDefined();
    expect(within(agentPane()).getByText("Today")).toBeDefined();
    expect(runtime.requests[0]?.prompt).toContain("Book flights for Rome trip");
  });

  it("files the Inbox when the user applies the agent's plan", async () => {
    const { store } = renderApp(undefined, undefined, undefined, {
      turn: (request) => {
        const ids = [...request.prompt.matchAll(/- \[(?<id>[^\]]+)\] /gu)].map(
          (match) => match.groups?.id ?? ""
        );

        return [
          { text: "Here is a plan.", type: "text" },
          {
            input: {
              items: ids.map((id) => ({
                destination: "someday",
                reason: "Later",
                task_id: id,
              })),
              summary: "File the 7 Inbox items",
            },
            name: "propose_filing",
            type: "tool",
          },
        ];
      },
    });

    const user = userEvent.setup();

    await screen.findByText("Book flights for Rome trip");
    await user.type(await openAgent(user), "Sort my inbox{Enter}");

    const card = await within(agentPane()).findByRole("region", {
      name: "File the 7 Inbox items",
    });

    expect(store.listInbox()).toHaveLength(7);

    await user.click(within(card).getByRole("button", { name: "Apply all" }));

    await waitFor(() => {
      expect(store.listInbox()).toHaveLength(0);
    });
    await expect(within(card).findByText("Applied")).resolves.toBeDefined();
    await waitFor(() => {
      expect(
        within(screen.getByRole("main")).queryByText(
          "Book flights for Rome trip"
        )
      ).toBeNull();
    });
  });

  it("reloads the open journal page when an edit is applied", async () => {
    renderApp(
      { day: today, kind: "journal" },
      (store) => {
        store.journal.write(today, "## Wins\n- Shipped\n- Ran 8 km");
      },
      undefined,
      {
        turn: turns([
          {
            input: {
              day: today,
              edits: [
                {
                  from_line: 2,
                  replacement: "- [ ] Shipped\n- [ ] Ran 8 km",
                  to_line: 3,
                },
              ],
              summary: "Turn the wins into checkboxes",
            },
            name: "propose_journal_edit",
            type: "tool",
          },
        ]),
      }
    );

    const user = userEvent.setup();

    await screen.findByRole("textbox", {
      name: "Journal for Friday, October 23",
    });
    await user.type(await openAgent(user), "Make these checkboxes{Enter}");

    const card = await within(agentPane()).findByRole("region", {
      name: "Turn the wins into checkboxes",
    });

    await user.click(within(card).getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      const content = screen.getByRole("textbox", {
        name: "Journal for Friday, October 23",
      });

      expect(EditorView.findFromDOM(content)?.state.doc.toString()).toBe(
        "## Wins\n- [ ] Shipped\n- [ ] Ran 8 km"
      );
    });

    await user.click(
      await within(agentPane()).findByRole("button", { name: "Undo" })
    );

    await waitFor(() => {
      const content = screen.getByRole("textbox", {
        name: "Journal for Friday, October 23",
      });

      expect(EditorView.findFromDOM(content)?.state.doc.toString()).toBe(
        "## Wins\n- Shipped\n- Ran 8 km"
      );
    });
  });

  it("shows what it remembers, and forgets on request", async () => {
    renderApp(undefined, undefined, undefined, {
      turn: turns([
        {
          input: { text: "Diane is the venue contact" },
          name: "remember",
          type: "tool",
        },
      ]),
    });

    const user = userEvent.setup();

    await screen.findByText("Book flights for Rome trip");
    await user.type(await openAgent(user), "Diane handles the venue{Enter}");
    await within(agentPane()).findByText(
      "Remembered: Diane is the venue contact"
    );

    await user.click(
      within(agentPane()).getByRole("button", { name: "Memory" })
    );

    const dialog = await screen.findByRole("dialog", { name: "Memory" });

    await user.click(
      await within(dialog).findByRole("button", {
        name: "Forget “Diane is the venue contact”",
      })
    );

    await expect(
      within(dialog).findByText(/Nothing yet/u)
    ).resolves.toBeDefined();
  });
});

describe("⌘K in the journal", () => {
  it("rewrites the paragraph and notes it in the conversation", async () => {
    const { agent, runtime, store } = renderApp(
      { day: today, kind: "journal" },
      (prepared) => {
        prepared.journal.write(today, "- Shipped\n- Ran 8 km");
      },
      undefined,
      { complete: () => ({ replacement: "- [ ] Shipped\n- [ ] Ran 8 km" }) }
    );

    const user = userEvent.setup();

    const content = await screen.findByRole("textbox", {
      name: "Journal for Friday, October 23",
    });

    const view = EditorView.findFromDOM(content);

    if (view === null) {
      throw new Error("The journal is not a CodeMirror editor.");
    }

    const mac = /Mac/u.test(navigator.platform);

    // The cursor opens at the end of the page, inside the list.
    view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        ctrlKey: !mac,
        key: "k",
        metaKey: mac,
      })
    );

    await user.type(
      await screen.findByRole("textbox", { name: "What should change?" }),
      "Make checkboxes{Enter}"
    );
    await user.click(await screen.findByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(store.journal.read(today).markdown).toBe(
        "- [ ] Shipped\n- [ ] Ran 8 km"
      );
    });
    expect(runtime.completions[0]?.prompt).toContain("Make checkboxes");
    await waitFor(() => {
      expect(JSON.stringify(agent.history())).toContain("with ⌘K");
    });
  });
});

/** Arguments as a buggy or hostile renderer might send them. */
const fromRenderer = (
  ...args: (string | number | null | object)[]
): Parameters<Agent[AgentMethod]> =>
  // SAFETY: deliberately wrong, to check that the handler refuses them.
  args as Parameters<Agent[AgentMethod]>;

describe("the agent's IPC channel", () => {
  it("refuses unknown methods and wrong arguments", () => {
    const { agent } = renderApp();

    expect(() => callAgent(agent, "constructor", fromRenderer())).toThrow(
      InvalidAgentCallError
    );
    expect(() => callAgent(agent, "send", fromRenderer(42, null))).toThrow(
      InvalidAgentCallError
    );
    expect(() =>
      callAgent(
        agent,
        "send",
        fromRenderer("Hi", { day: "soon", view: "journal" })
      )
    ).toThrow(InvalidAgentCallError);
    expect(() =>
      callAgent(agent, "decide", fromRenderer("p1", "maybe"))
    ).toThrow(InvalidAgentCallError);
  });
});
