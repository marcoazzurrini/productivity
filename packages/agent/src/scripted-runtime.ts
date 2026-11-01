import type { AgentStatus, JsonValue } from "./model.ts";
import type {
  AgentRuntime,
  CompleteRequest,
  RunRequest,
  RuntimeEvent,
} from "./runtime.ts";

/** One thing a scripted turn does. */
export type ScriptStep =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; input: { [key: string]: JsonValue } }
  | { type: "fail"; message: string; sessionMissing?: boolean };

export interface ScriptedRuntimeOptions {
  /** The steps of each turn. Defaults to repeating the user's last line. */
  turn?: (request: RunRequest) => ScriptStep[];
  /** The answer to one-off requests, such as ⌘K edits. */
  complete?: (request: CompleteRequest) => JsonValue;
  status?: AgentStatus;
}

export interface ScriptedRuntime extends AgentRuntime {
  /** Every turn it was asked to run, oldest first. */
  requests: RunRequest[];
  completions: CompleteRequest[];
}

const echo = (request: RunRequest): ScriptStep[] => [
  {
    text: `You said: ${request.prompt.split("\n").at(-1) ?? ""}`,
    type: "text",
  },
];

/** A text step, streamed in two halves as a model would. */
const textEvents = (text: string): RuntimeEvent[] => {
  const half = Math.ceil(text.length / 2);

  return [
    { text: text.slice(0, half), type: "text-delta" },
    { text: text.slice(half), type: "text-delta" },
    { text, type: "text" },
  ];
};

/**
 * A runtime that plays back a script instead of calling a model. Tools run
 * for real, against whatever the agent was given. For tests, and for the
 * end-to-end suite, which has no Claude login.
 */
export const createScriptedRuntime = (
  options: ScriptedRuntimeOptions = {}
): ScriptedRuntime => {
  const requests: RunRequest[] = [];
  const completions: CompleteRequest[] = [];

  const run = async function* run(
    request: RunRequest
  ): AsyncGenerator<RuntimeEvent> {
    requests.push(request);

    for (const step of (options.turn ?? echo)(request)) {
      if (request.signal.aborted) {
        return;
      }

      if (step.type === "fail") {
        yield {
          message: step.message,
          sessionMissing: step.sessionMissing ?? false,
          type: "failed",
        };

        return;
      }

      if (step.type === "text") {
        yield* textEvents(step.text);
        continue;
      }

      const tool = request.tools.find((each) => each.name === step.name);

      if (tool === undefined) {
        throw new Error(`The script calls an unknown tool, ${step.name}.`);
      }

      yield { input: step.input, name: step.name, type: "tool" };

      // A refusal reaches the model as text in the real runtime; a script
      // carries on, as a model would after reading it.
      try {
        // oxlint-disable-next-line no-await-in-loop -- steps run in order.
        await tool.run(step.input);
      } catch {
        // Carry on with the next step.
      }
    }

    yield { type: "done" };
  };

  return {
    complete: (request) => {
      completions.push(request);

      return Promise.resolve(
        options.complete?.(request) ?? { replacement: "", summary: "" }
      );
    },
    completions,
    requests,
    run,
    status: () =>
      Promise.resolve(
        options.status ?? { email: null, plan: null, state: "ready" }
      ),
  };
};
