import { isAgentMethod } from "@productivity/agent";
import type { Agent, AgentMethod } from "@productivity/agent";
import { z } from "zod";

export class InvalidAgentCallError extends TypeError {
  constructor(method: string) {
    super(`"${method}" is not an agent method, or its arguments are wrong.`);
    this.name = "InvalidAgentCallError";
  }
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const id = z.string().min(1).max(200);

const view = z.union([
  z.object({ day, view: z.literal("journal") }),
  z.object({
    view: z.enum([
      "inbox",
      "next-actions",
      "upcoming",
      "waiting",
      "someday",
      "review",
    ]),
  }),
  z.object({ projectId: id, view: z.literal("project") }),
]);

/**
 * The arguments each method accepts. Calls arrive from the renderer
 * untyped, so they are checked here, at the IPC boundary.
 */
const argumentsOf = {
  clear: z.tuple([]),
  decide: z.tuple([id, z.enum(["apply", "discard"])]),
  deleteNote: z.tuple([id]),
  history: z.union([
    z.tuple([]),
    z.tuple([z.number().int().positive().optional()]),
  ]),
  inlineEdit: z.tuple([
    z.object({
      day,
      from: z.number().int().nonnegative(),
      instruction: z.string().min(1).max(2000),
      markdown: z.string().max(500_000),
      to: z.number().int().nonnegative(),
    }),
  ]),
  isRunning: z.tuple([]),
  notes: z.tuple([]),
  recordInlineEdit: z.tuple([day, z.string().min(1).max(2000)]),
  send: z.tuple([z.string().min(1).max(20_000), view.nullable()]),
  status: z.tuple([]),
  stop: z.tuple([]),
  undo: z.tuple([id]),
} satisfies Record<AgentMethod, z.ZodType>;

/** Runs one agent method, after checking its arguments. */
export const runAgentMethod = async <Method extends AgentMethod>(
  agent: Agent,
  method: Method,
  args: Parameters<Agent[Method]>
): Promise<Awaited<ReturnType<Agent[Method]>>> => {
  // SAFETY: indexing Agent with a single method name yields that method;
  // TypeScript cannot correlate the generic key with its parameter list.
  const run = agent[method] as (
    ...input: Parameters<Agent[Method]>
  ) => ReturnType<Agent[Method]>;

  return await run(...args);
};

/** Runs one call from the renderer. Anything but an agent method is refused. */
export const callAgent = (
  agent: Agent,
  method: string,
  args: Parameters<Agent[AgentMethod]>
) => {
  if (!isAgentMethod(method)) {
    throw new InvalidAgentCallError(method);
  }

  const checked = argumentsOf[method].safeParse(args);

  if (!checked.success) {
    throw new InvalidAgentCallError(method);
  }

  // SAFETY: the schema for this method matches its parameter list.
  return runAgentMethod(
    agent,
    method,
    checked.data as Parameters<Agent[typeof method]>
  );
};
