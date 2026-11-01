import { execFile } from "node:child_process";
import { once } from "node:events";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import {
  createSdkMcpServer,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import type {
  Options,
  SDKMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { AgentStatus, JsonValue } from "./model.ts";
import type {
  AgentRuntime,
  AgentTool,
  CompleteRequest,
  RunRequest,
  RuntimeEvent,
} from "./runtime.ts";

export interface ClaudeRuntimeOptions {
  /** Finds the `claude` program, or null when it is not installed. */
  findClaude: () => Promise<string | null>;
  /** Claude Code's working folder. Its transcripts are filed under it. */
  cwd: string;
  /** The environment to start Claude Code with, before API keys are removed. */
  env: Record<string, string | undefined>;
  /** The conversation's model alias, or Claude Code's default. */
  model?: string;
}

const serverName = "productivity";
const toolPrefix = `mcp__${serverName}__`;
const runFile = promisify(execFile);

/**
 * Variables that would make Claude Code use an API key instead of the
 * user's subscription login, or think it runs inside another Claude Code.
 */
const droppedVariables = new Set([
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDECODE",
  "CLAUDE_CODE_ENTRYPOINT",
  "ELECTRON_RUN_AS_NODE",
]);

const cleanEnvironment = (
  env: Record<string, string | undefined>
): Record<string, string | undefined> =>
  Object.fromEntries(
    Object.entries(env).filter(([key]) => !droppedVariables.has(key))
  );

const missingClaude =
  "Claude Code is not installed. Install it from claude.com/code, run `claude` once in Terminal to sign in, then try again.";

/** How long Claude Code may take to start before the status check gives up. */
const startTimeoutMs = 20_000;

/** Where installers put `claude`, for when the login shell cannot say. */
const knownPlaces = (): string[] => [
  path.join(homedir(), ".local", "bin", "claude"),
  path.join(homedir(), ".claude", "local", "claude"),
  "/opt/homebrew/bin/claude",
  "/usr/local/bin/claude",
];

const isExecutable = (file: string): boolean => {
  try {
    accessSync(file, constants.X_OK);

    return true;
  } catch {
    return false;
  }
};

/**
 * Asks the login shell where `claude` is. An app opened from Finder gets a
 * short PATH; the login shell has the user's full one.
 */
const askLoginShell = async (): Promise<string | null> => {
  try {
    const { stdout } = await runFile(
      process.env.SHELL ?? "/bin/zsh",
      ["-lc", "command -v claude"],
      { timeout: 5000 }
    );

    const found = stdout.trim().split("\n").at(-1) ?? "";

    return found.startsWith("/") ? found : null;
  } catch {
    return null;
  }
};

/**
 * Finds the user's `claude`: the configured path, the login shell's
 * answer, or a known install folder.
 */
export const findClaudeExecutable = async (
  configured?: string
): Promise<string | null> => {
  if (configured !== undefined && configured !== "") {
    return isExecutable(configured) ? configured : null;
  }

  const fromShell = await askLoginShell();

  if (fromShell !== null && isExecutable(fromShell)) {
    return fromShell;
  }

  return knownPlaces().find(isExecutable) ?? null;
};

/** The words of something thrown, which may not be an Error. */
const thrownText = (thrown: Error | string): string =>
  thrown instanceof Error ? thrown.message : thrown;

const toMcpTool = (agentTool: AgentTool) =>
  tool(
    agentTool.name,
    agentTool.description,
    agentTool.input,
    async (input): Promise<CallToolResult> => {
      try {
        return {
          content: [{ text: await agentTool.run(input), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: thrownText(error instanceof Error ? error : String(error)),
              type: "text",
            },
          ],
          isError: true,
        };
      }
    }
  );

const userMessage = (text: string): SDKUserMessage => ({
  message: { content: text, role: "user" },
  parent_tool_use_id: null,
  type: "user",
});

const single = async function* single(
  text: string
): AsyncGenerator<SDKUserMessage> {
  yield userMessage(text);
};

// Sends nothing until `signal` aborts: it starts Claude Code without a
// prompt, so the status check costs no usage.
const silence = async function* silence(
  signal: AbortSignal
): AsyncGenerator<SDKUserMessage> {
  await once(signal, "abort");

  // Never true after an abort: the generator ends without sending a prompt.
  if (!signal.aborted) {
    yield userMessage("");
  }
};

const isSessionMissing = (message: string): boolean =>
  message.includes("No conversation found");

const resultError = (message: SDKMessage): string | null => {
  if (message.type !== "result" || message.subtype === "success") {
    return null;
  }

  return (
    message.errors.join("\n") || `Claude Code stopped: ${message.subtype}.`
  );
};

/** The model's tool input, which should be an object. */
const toolInput = z.looseObject({});

/** Turns the SDK's messages into the agent's events. */
const toEvents = (message: SDKMessage): RuntimeEvent[] => {
  if (message.type === "stream_event" && message.parent_tool_use_id === null) {
    const { event } = message;

    return event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
      ? [{ text: event.delta.text, type: "text-delta" }]
      : [];
  }

  if (message.type === "assistant" && message.parent_tool_use_id === null) {
    return message.message.content.flatMap((block): RuntimeEvent[] => {
      if (block.type === "text") {
        return [{ text: block.text, type: "text" }];
      }

      if (block.type === "tool_use" && block.name.startsWith(toolPrefix)) {
        const input = toolInput.safeParse(block.input);

        return [
          {
            input: input.success ? input.data : {},
            name: block.name.slice(toolPrefix.length),
            type: "tool",
          },
        ];
      }

      return [];
    });
  }

  return [];
};

/** An abort controller that follows `signal`. */
const followSignal = (signal: AbortSignal | undefined): AbortController => {
  const controller = new AbortController();

  signal?.addEventListener("abort", () => {
    controller.abort();
  });

  return controller;
};

const jsonValue = z.json();

/**
 * Runs the agent through Claude Code with the Agent SDK. Claude Code uses
 * the user's own login, so the subscription pays and no API key is needed.
 * Only our tools are offered: no shell, files or web.
 */
export const createClaudeRuntime = (
  options: ClaudeRuntimeOptions
): AgentRuntime => {
  const env = cleanEnvironment(options.env);

  const base = (claude: string, model: string | undefined): Options => {
    const settings: Options = {
      cwd: options.cwd,
      env,
      pathToClaudeCodeExecutable: claude,
      // Ignore ~/.claude settings, hooks and CLAUDE.md: this is not coding.
      settingSources: [],
      tools: [],
    };

    if (model !== undefined) {
      settings.model = model;
    }

    return settings;
  };

  const run = async function* run(
    request: RunRequest
  ): AsyncGenerator<RuntimeEvent> {
    const claude = await options.findClaude();

    if (claude === null) {
      yield { message: missingClaude, sessionMissing: false, type: "failed" };

      return;
    }

    const abortController = followSignal(request.signal);
    const names = request.tools.map((each) => `${toolPrefix}${each.name}`);

    const settings: Options = {
      ...base(claude, options.model),
      abortController,
      allowedTools: names,
      // Anything not on the list is refused, never asked about.
      canUseTool: (toolName) =>
        Promise.resolve(
          names.includes(toolName)
            ? { behavior: "allow" }
            : { behavior: "deny", message: "This tool is not available." }
        ),
      includePartialMessages: true,
      mcpServers: {
        [serverName]: createSdkMcpServer({
          name: serverName,
          tools: request.tools.map(toMcpTool),
          version: "1.0.0",
        }),
      },
      systemPrompt: request.system,
    };

    if (request.resume) {
      settings.resume = request.sessionId;
    } else {
      settings.sessionId = request.sessionId;
    }

    const conversation = query({
      options: settings,
      prompt: single(request.prompt),
    });

    let failed = false;

    try {
      for await (const message of conversation) {
        const error = resultError(message);

        if (error !== null) {
          failed = true;
          yield {
            message: error,
            sessionMissing: isSessionMissing(error),
            type: "failed",
          };

          return;
        }

        yield* toEvents(message);
      }

      yield { type: "done" };
    } catch (error) {
      if (failed || abortController.signal.aborted) {
        return;
      }

      const message = thrownText(
        error instanceof Error ? error : String(error)
      );

      yield {
        message,
        sessionMissing: isSessionMissing(message),
        type: "failed",
      };
    } finally {
      conversation.close();
    }
  };

  const complete = async (request: CompleteRequest): Promise<JsonValue> => {
    const claude = await options.findClaude();

    if (claude === null) {
      throw new Error(missingClaude);
    }

    const answer = query({
      options: {
        ...base(claude, request.model),
        abortController: followSignal(request.signal),
        outputFormat: { schema: request.schema, type: "json_schema" },
        // One-off answers are not part of the conversation.
        persistSession: false,
        systemPrompt: request.system,
      },
      prompt: request.prompt,
    });

    try {
      for await (const message of answer) {
        if (message.type === "result") {
          if (message.subtype === "success") {
            return jsonValue.parse(message.structured_output);
          }

          throw new Error(resultError(message) ?? "Claude Code failed.");
        }
      }
    } finally {
      answer.close();
    }

    throw new Error("Claude Code ended without an answer.");
  };

  const status = async (): Promise<AgentStatus> => {
    const claude = await options.findClaude();

    if (claude === null) {
      return { detail: missingClaude, state: "missing" };
    }

    const abortController = new AbortController();

    const probe = query({
      options: { ...base(claude, undefined), abortController },
      prompt: silence(abortController.signal),
    });

    const tooSlow = async (): Promise<never> => {
      await delay(startTimeoutMs, undefined, {
        signal: abortController.signal,
      });

      throw new Error("Claude Code took too long to start.");
    };

    try {
      const { account } = await Promise.race([
        probe.initializationResult(),
        tooSlow(),
      ]);

      const signedIn =
        (account.tokenSource !== undefined && account.tokenSource !== "none") ||
        account.email !== undefined ||
        account.subscriptionType !== undefined;

      return signedIn
        ? {
            email: account.email ?? null,
            plan: account.subscriptionType ?? null,
            state: "ready",
          }
        : { state: "signed-out" };
    } catch (error) {
      return {
        detail: thrownText(error instanceof Error ? error : String(error)),
        state: "error",
      };
    } finally {
      abortController.abort();
      probe.close();
    }
  };

  return { complete, run, status };
};
