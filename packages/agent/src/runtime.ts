import type { z } from "zod";

import type { AgentStatus, JsonValue } from "./model.ts";

/** A tool's input fields, as zod schemas: the form the Agent SDK takes. */
export type ToolFields = Record<string, z.ZodType>;

/** What the model sent a tool: an object it built from the tool's fields. */
export type ToolInput = object;

/**
 * A tool the model can call, independent of the SDK that runs it. Input
 * arrives from the model, so `label` and `run` parse it themselves.
 */
export interface AgentTool {
  name: string;
  description: string;
  input: ToolFields;
  /** Read-only tools run without asking. */
  readOnly: boolean;
  /** What the user sees while it runs: "Read the journal for Sat Oct 24". */
  // oxlint-disable-next-line anti-slop/no-object-parameters -- each tool parses its input with its own schema.
  label: (input: ToolInput) => string;
  /** The text the model gets back. Throw to report an error to the model. */
  // oxlint-disable-next-line anti-slop/no-object-parameters -- as above.
  run: (input: ToolInput) => string | Promise<string>;
}

export type RuntimeEvent =
  /** More text of the reply being written. */
  | { type: "text-delta"; text: string }
  /** A finished block of reply text. */
  | { type: "text"; text: string }
  /** The model called one of our tools. */
  | { type: "tool"; name: string; input: ToolInput }
  | { type: "done" }
  | {
      type: "failed";
      message: string;
      /** The session to resume no longer exists. */
      sessionMissing: boolean;
    };

export interface RunRequest {
  sessionId: string;
  /** Continue the session, rather than start it. */
  resume: boolean;
  prompt: string;
  system: string;
  tools: readonly AgentTool[];
  signal: AbortSignal;
}

/** A JSON Schema, as zod writes one. */
export type AnswerSchema = z.core.JSONSchema.JSONSchema;

export interface CompleteRequest {
  system: string;
  prompt: string;
  /** The shape of the answer, as JSON Schema. */
  schema: AnswerSchema;
  /** A model alias such as "haiku", or the default when absent. */
  model?: string;
  signal?: AbortSignal;
}

/**
 * Runs the model. ClaudeRuntime does it through Claude Code; tests use a
 * scripted runtime, so they never start a model.
 */
export interface AgentRuntime {
  /** One turn of the ongoing conversation. Tools run while it streams. */
  run: (request: RunRequest) => AsyncIterable<RuntimeEvent>;
  /** A one-off answer, outside the conversation, following `schema`. */
  complete: (request: CompleteRequest) => Promise<JsonValue>;
  status: () => Promise<AgentStatus>;
}
