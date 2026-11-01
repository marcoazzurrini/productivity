import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createAgent, createScriptedRuntime } from "@productivity/agent";
import type { Proposal } from "@productivity/agent";

import { openStore } from "../src/index.ts";
import type { Store } from "../src/index.ts";
import { fixedNow, memoryStore } from "./helpers.ts";

let store: Store;

afterEach(() => {
  store.close();
});

const proposal = (id: string): Proposal => ({
  action: { kind: "delete-task", taskId: "t1", title: "Old task" },
  createdAt: "2026-10-23T12:40:00.000Z",
  decidedAt: null,
  id,
  status: "pending",
  summary: "Delete the old task",
});

describe("the agent's storage", () => {
  test("numbers messages in order and pages back through them", () => {
    store = memoryStore();
    const repository = store.agentRepository;

    for (const text of ["one", "two", "three"]) {
      repository.appendMessage({
        blocks: [{ kind: "text", text }],
        createdAt: "2026-10-23T12:40:00.000Z",
        role: "user",
      });
    }

    expect(
      repository.listMessages({ limit: 2 }).map((message) => message.seq)
    ).toEqual([2, 3]);
    expect(
      repository
        .listMessages({ beforeSeq: 2, limit: 10 })
        .map((message) => message.blocks)
    ).toEqual([[{ kind: "text", text: "one" }]]);
    expect(repository.messagesAfter(1).map((message) => message.seq)).toEqual([
      2, 3,
    ]);
  });

  test("updates a message's blocks, and hides everything on clear", () => {
    store = memoryStore();
    const repository = store.agentRepository;

    const message = repository.appendMessage({
      blocks: [],
      createdAt: "2026-10-23T12:40:00.000Z",
      role: "assistant",
    });

    repository.updateMessage(message.id, [
      { kind: "tool", label: "Read the journal" },
    ]);

    expect(repository.listMessages({ limit: 5 })[0]?.blocks).toEqual([
      { kind: "tool", label: "Read the journal" },
    ]);

    repository.hideMessages();

    const next = repository.appendMessage({
      blocks: [],
      createdAt: "2026-10-23T12:41:00.000Z",
      role: "user",
    });

    expect(next.seq).toBe(2);
    expect(
      repository.listMessages({ limit: 5 }).map((each) => each.id)
    ).toEqual([next.id]);
  });

  test("keeps state, proposals, changes and notes", () => {
    store = memoryStore();
    const repository = store.agentRepository;

    repository.setState("session-id", "abc");
    repository.setState("session-id", "def");
    expect(repository.getState("session-id")).toBe("def");
    repository.setState("session-id", null);
    expect(repository.getState("session-id")).toBeNull();

    repository.saveProposal(proposal("p1"));
    repository.saveProposal({ ...proposal("p1"), status: "applied" });
    expect(repository.getProposal("p1")?.status).toBe("applied");
    expect(repository.getProposal("nope")).toBeNull();

    const change = {
      createdAt: "2026-10-23T12:40:00.000Z",
      id: "c1",
      summary: "Added to Inbox: Stamps",
      undo: { kind: "delete-task", taskId: "t1" },
      undoneAt: null,
    } as const;

    repository.saveChange(change);
    expect(repository.getChange("c1")).toEqual(change);

    const note = {
      createdAt: "2026-10-23T12:40:00.000Z",
      doneAt: null,
      id: "n1",
      kind: "memory",
      text: "Likes tea",
    } as const;

    repository.saveNote(note);
    repository.saveNote({ ...note, text: "Likes green tea" });
    expect(repository.listNotes()).toEqual([
      { ...note, text: "Likes green tea" },
    ]);
    repository.deleteNote("n1");
    expect(repository.listNotes()).toEqual([]);
  });

  test("the agent keeps its conversation and session across restarts", async () => {
    const folder = mkdtempSync(path.join(tmpdir(), "productivity-agent-"));
    const file = path.join(folder, "db.sqlite");

    try {
      const runtime = createScriptedRuntime();
      store = openStore({ clock: () => fixedNow, path: file });

      const first = createAgent({
        gtd: store,
        journal: store.journal,
        repository: store.agentRepository,
        runtime,
      });

      first.send("Hello", null);
      await first.idle();
      store.close();

      store = openStore({ clock: () => fixedNow, path: file });

      const second = createAgent({
        gtd: store,
        journal: store.journal,
        repository: store.agentRepository,
        runtime,
      });

      second.send("Still there?", null);
      await second.idle();

      expect(second.history()).toHaveLength(4);
      expect(runtime.requests[1]?.resume).toBe(true);
      expect(runtime.requests[1]?.sessionId).toBe(
        runtime.requests[0]?.sessionId ?? ""
      );
    } finally {
      rmSync(folder, { force: true, recursive: true });
    }
  });
});
