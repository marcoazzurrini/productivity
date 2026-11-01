import type { Agent, AgentEvent, AgentMethod } from "@productivity/agent";

/** The IPC channels for the agent. */
export const agentChannel = {
  call: "agent:call",
  /** Main to renderer: the agent's events, as it writes and changes things. */
  event: "agent:event",
} as const;

/** Calls one agent method in the main process. */
export type AgentTransport = <Method extends AgentMethod>(
  method: Method,
  args: Parameters<Agent[Method]>
) => Promise<Awaited<ReturnType<Agent[Method]>>>;

/** What the preload script gives the renderer for the agent. */
export interface AgentBridge {
  call: AgentTransport;
  /** Calls `listener` with each event. Returns an unsubscribe. */
  onEvent: (listener: (event: AgentEvent) => void) => () => void;
}

/** The agent's methods, each a promise, for the renderer. */
export type RemoteAgent = {
  [Method in AgentMethod]: (
    ...args: Parameters<Agent[Method]>
  ) => Promise<Awaited<ReturnType<Agent[Method]>>>;
};

export const createRemoteAgent = (call: AgentTransport): RemoteAgent => ({
  clear: (...args) => call("clear", args),
  decide: (...args) => call("decide", args),
  deleteNote: (...args) => call("deleteNote", args),
  history: (...args) => call("history", args),
  inlineEdit: (...args) => call("inlineEdit", args),
  isRunning: (...args) => call("isRunning", args),
  notes: (...args) => call("notes", args),
  recordInlineEdit: (...args) => call("recordInlineEdit", args),
  send: (...args) => call("send", args),
  status: (...args) => call("status", args),
  stop: (...args) => call("stop", args),
  undo: (...args) => call("undo", args),
});
