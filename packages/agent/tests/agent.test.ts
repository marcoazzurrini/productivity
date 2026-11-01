import { describe, expect, test } from "bun:test";

import { createAgent, createScriptedRuntime } from "../src/index.ts";
import type {
  AgentEvent,
  AgentMessage,
  Proposal,
  RunRequest,
  ScriptStep,
  ScriptedRuntimeOptions,
} from "../src/index.ts";
import { fakeGtd, fakeJournal, fixedNow } from "./fakes.ts";
import { memoryRepository } from "./memory-repository.ts";

const today = "2026-10-23";

const setup = (options: ScriptedRuntimeOptions = {}) => {
  const gtd = fakeGtd();
  const journal = fakeJournal();
  const repository = memoryRepository();
  const runtime = createScriptedRuntime(options);
  const events: AgentEvent[] = [];

  const agent = createAgent({
    clock: () => fixedNow,
    gtd: gtd.store,
    journal,
    repository,
    runtime,
  });

  agent.subscribe((event) => {
    events.push(event);
  });

  const say = async (
    text: string,
    view: Parameters<typeof agent.send>[1] = null
  ) => {
    agent.send(text, view);
    await agent.idle();
  };

  return { agent, events, gtd, journal, repository, runtime, say };
};

/** Plays each turn's steps in order, one list per turn. */
const turns =
  (...scripts: ScriptStep[][]) =>
  (request: RunRequest): ScriptStep[] => {
    void request;

    return scripts.shift() ?? [];
  };

const textOf = (message: AgentMessage | undefined): string =>
  (message?.blocks ?? [])
    .map((block) => (block.kind === "text" ? block.text : `[${block.kind}]`))
    .join(" ");

const proposalIn = (messages: AgentMessage[]): Proposal => {
  for (const message of messages) {
    for (const block of message.blocks) {
      if (block.kind === "proposal") {
        return block.proposal;
      }
    }
  }

  throw new Error("No proposal in the conversation.");
};

describe("the conversation", () => {
  test("keeps the user's message and the streamed reply", async () => {
    const { agent, events, say } = setup({
      turn: turns([{ text: "Two items.", type: "text" }]),
    });

    await say("What's in my inbox?");

    expect(
      agent.history().map((message) => [message.role, textOf(message)])
    ).toEqual([
      ["user", "What's in my inbox?"],
      ["assistant", "Two items."],
    ]);
    expect(events.filter((event) => event.type === "delta")).toHaveLength(2);
    expect(events.at(-1)).toEqual({ running: false, type: "running" });
  });

  test("starts one session, then resumes it every turn", async () => {
    const { runtime, say } = setup();

    await say("Hello");
    await say("Again");

    const [first, second] = runtime.requests;

    expect(first?.resume).toBe(false);
    expect(second?.resume).toBe(true);
    expect(second?.sessionId).toBe(first?.sessionId ?? "");
  });

  test("tells the model what the user has open", async () => {
    const { journal, runtime, say } = setup();

    journal.write(today, "## Wins\n- Shipped the design");
    await say("Tidy this up", { day: today, view: "journal" });

    const prompt = runtime.requests[0]?.prompt ?? "";

    expect(prompt).toContain("<current_view>");
    expect(prompt).toContain("2| - Shipped the design");
    expect(prompt.endsWith("Tidy this up")).toBe(true);
  });

  test("runs queued messages one after another", async () => {
    const { agent, runtime } = setup();

    agent.send("One", null);
    agent.send("Two", null);
    await agent.idle();

    expect(
      runtime.requests.map((request) => request.prompt.split("\n").at(-1))
    ).toEqual(["One", "Two"]);
  });

  test("starts a new session, carrying the conversation, when the old one is gone", async () => {
    const { runtime, say } = setup({
      turn: turns(
        [{ text: "Hi.", type: "text" }],
        [
          {
            message: "No conversation found",
            sessionMissing: true,
            type: "fail",
          },
        ],
        [{ text: "Still here.", type: "text" }]
      ),
    });

    await say("Hello");
    await say("Are you there?");

    const [first, failed, retried] = runtime.requests;

    expect(failed?.resume).toBe(true);
    expect(retried?.resume).toBe(false);
    expect(retried?.sessionId).not.toBe(first?.sessionId ?? "");
    expect(retried?.prompt).toContain("<earlier_conversation>");
    expect(retried?.prompt).toContain("User (");
  });

  test("shows a failure in the reply", async () => {
    const { agent, say } = setup({
      turn: turns([{ message: "Usage limit reached.", type: "fail" }]),
    });

    await say("Hello");

    expect(agent.history().at(-1)?.blocks).toEqual([
      { kind: "error", text: "Usage limit reached." },
    ]);
  });

  test("stopping ends the reply without writing more", async () => {
    const { agent, say } = setup({
      turn: turns([
        { text: "First part.", type: "text" },
        { input: { title: "Never added" }, name: "capture", type: "tool" },
      ]),
    });

    agent.subscribe((event) => {
      if (event.type === "message" && event.message.role === "assistant") {
        agent.stop();
      }
    });
    await say("Go");

    expect(JSON.stringify(agent.history())).not.toContain("Never added");
  });

  test("clearing hides the conversation and starts a new session", async () => {
    const { agent, runtime, say } = setup();

    await say("Hello");
    agent.clear();
    await say("Fresh start");

    expect(agent.history().map(textOf)).toEqual([
      "Fresh start",
      "You said: Fresh start",
    ]);
    expect(runtime.requests[1]?.resume).toBe(false);
    expect(runtime.requests[1]?.prompt).not.toContain("<earlier_conversation>");
  });
});

describe("changes the agent makes", () => {
  test("captures to the Inbox at once, and undoes it", async () => {
    const { agent, gtd, say } = setup({
      turn: turns([
        { input: { title: "Buy stamps" }, name: "capture", type: "tool" },
        { text: "Added.", type: "text" },
      ]),
    });

    await say("Remind me to buy stamps");

    const titles = () => gtd.store.listInbox().map((task) => task.title);
    const reply = agent.history().at(-1);
    const change = reply?.blocks.find((block) => block.kind === "change");

    expect(titles()).toContain("Buy stamps");
    expect(reply?.blocks[0]).toEqual({
      kind: "tool",
      label: "Added to the Inbox: Buy stamps",
    });

    if (change?.kind !== "change") {
      throw new Error("The reply has no change.");
    }

    agent.undo(change.change.id);

    expect(titles()).not.toContain("Buy stamps");
  });

  test("proposes a journal edit, and applies it only when asked", async () => {
    const { agent, journal, say } = setup({
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
            summary: "Turn the bullets into checkboxes",
          },
          name: "propose_journal_edit",
          type: "tool",
        },
      ]),
    });

    journal.write(today, "## Wins\n- Shipped\n- Ran 8 km");
    await say("Make these checkboxes", { day: today, view: "journal" });

    const proposal = proposalIn(agent.history());

    expect(proposal.status).toBe("pending");
    expect(journal.pages.get(today)).toBe("## Wins\n- Shipped\n- Ran 8 km");
    expect(proposal.action).toMatchObject({
      changes: [
        {
          added: ["- [ ] Shipped", "- [ ] Ran 8 km"],
          line: 2,
          removed: ["- Shipped", "- Ran 8 km"],
        },
      ],
      kind: "edit-journal",
    });

    agent.decide(proposal.id, "apply");

    expect(journal.pages.get(today)).toBe(
      "## Wins\n- [ ] Shipped\n- [ ] Ran 8 km"
    );
    expect(proposalIn(agent.history()).status).toBe("applied");

    const event = agent.history().at(-1);
    const change = event?.blocks.find((block) => block.kind === "change");

    expect(event?.role).toBe("event");

    if (change?.kind !== "change") {
      throw new Error("Applying left no change to undo.");
    }

    agent.undo(change.change.id);

    expect(journal.pages.get(today)).toBe("## Wins\n- Shipped\n- Ran 8 km");
  });

  test("marks a journal edit stale when the page changed since", async () => {
    const { agent, journal, say } = setup({
      turn: turns([
        {
          input: {
            day: today,
            edits: [{ from_line: 1, replacement: "Hi", to_line: 1 }],
            summary: "Greet",
          },
          name: "propose_journal_edit",
          type: "tool",
        },
      ]),
    });

    journal.write(today, "Hello");
    await say("Shorter");
    journal.write(today, "Hello there");
    agent.decide(proposalIn(agent.history()).id, "apply");

    expect(journal.pages.get(today)).toBe("Hello there");
    expect(proposalIn(agent.history()).status).toBe("stale");
  });

  test("files Inbox items when the plan is applied", async () => {
    const { agent, gtd, say } = setup({
      turn: turns([
        {
          input: {
            items: [
              {
                context_id: "c-calls",
                destination: "next",
                reason: "A call",
                task_id: "t-dentist",
              },
              {
                destination: "someday",
                reason: "Not yet",
                task_id: "t-passport",
              },
            ],
            summary: "File the Inbox",
          },
          name: "propose_filing",
          type: "tool",
        },
      ]),
    });

    await say("Sort my inbox", { view: "inbox" });

    const proposal = proposalIn(agent.history());

    expect(
      proposal.action.kind === "file-inbox" &&
        proposal.action.items.map((item) => item.destination)
    ).toEqual(["Next Actions · @Calls", "Someday / Maybe"]);
    expect(gtd.store.listInbox()).toHaveLength(2);

    agent.decide(proposal.id, "apply");

    expect(gtd.store.listInbox()).toHaveLength(0);
    expect(gtd.tasks.get("t-dentist")?.contextId).toBe("c-calls");
    expect(gtd.tasks.get("t-passport")?.list).toBe("someday");
  });

  test("tells the model on its next turn what the user applied", async () => {
    const { agent, runtime, say } = setup({
      turn: turns(
        [
          {
            input: { summary: "Bin it", task_id: "t-slides" },
            name: "propose_task_delete",
            type: "tool",
          },
        ],
        [{ text: "Noted.", type: "text" }]
      ),
    });

    await say("Delete the slides task");
    agent.decide(proposalIn(agent.history()).id, "apply");
    await say("Thanks");

    expect(runtime.requests[1]?.prompt).toContain("<since_last_reply>");
    expect(runtime.requests[1]?.prompt).toContain(
      'Applied: deleted "Draft slide outline"'
    );
  });
});

describe("memory", () => {
  test("remembers facts and gives them to every later turn", async () => {
    const { agent, runtime, say } = setup({
      turn: turns(
        [
          {
            input: { text: "Diane is the venue contact" },
            name: "remember",
            type: "tool",
          },
        ],
        [{ text: "Sure.", type: "text" }]
      ),
    });

    await say("Remember Diane handles the venue");
    await say("Who handles the venue?");

    expect(agent.notes().map((note) => note.text)).toEqual([
      "Diane is the venue contact",
    ]);
    expect(runtime.requests[1]?.system).toContain("Diane is the venue contact");
  });

  test("lets the user delete a memory", async () => {
    const { agent, say } = setup({
      turn: turns([
        { input: { text: "Likes tea" }, name: "remember", type: "tool" },
      ]),
    });

    await say("I like tea");
    const [note] = agent.notes();

    agent.deleteNote(note?.id ?? "");

    expect(agent.notes()).toEqual([]);
  });
});

describe("inline edits", () => {
  test("asks for the selection's new text, outside the conversation", async () => {
    const { agent, runtime } = setup({
      complete: () => ({ replacement: "- [ ] Shipped" }),
    });

    const replacement = await agent.inlineEdit({
      day: today,
      from: 8,
      instruction: "Make it a checkbox",
      markdown: "## Wins\n- Shipped",
      to: 17,
    });

    expect(replacement).toBe("- [ ] Shipped");
    expect(runtime.completions[0]?.prompt).toContain(
      "<selection>\n- Shipped\n</selection>"
    );
    expect(runtime.requests).toHaveLength(0);
  });

  test("refuses a selection outside the page", async () => {
    const { agent } = setup();

    await expect(
      agent.inlineEdit({
        day: today,
        from: 4,
        instruction: "x",
        markdown: "Hi",
        to: 9,
      })
    ).rejects.toThrow("not on the page");
  });
});
