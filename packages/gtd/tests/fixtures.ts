import type { Context, Task } from "../src/index.ts";

export const makeTask = (overrides: Partial<Task> = {}): Task => ({
  block: null,
  capturedAt: "2026-10-20T09:00",
  completedAt: null,
  contextId: null,
  deadline: null,
  energy: null,
  followUpOn: null,
  id: overrides.id ?? crypto.randomUUID(),
  list: "next",
  minutes: null,
  notes: "",
  projectId: null,
  source: "manual",
  starred: false,
  startOn: null,
  title: "Task",
  waitingOn: null,
  ...overrides,
});

export const computer: Context = {
  color: "blue",
  id: "computer",
  name: "@Computer",
};

export const calls: Context = { color: "green", id: "calls", name: "@Calls" };
