# Agent: technical plan

Status: built on 31 October 2026, in `packages/agent`. The notes at the end say where the build differs from this plan. The screens are on the **Agent** page of the penna design.

## Goal

One AI agent that lives in the app. There is no "new chat" and no list of agents. You open it and talk.

It has two ways in:

1. **Inline edit (⌘K)**: select lines in the journal, type an instruction, and accept or discard the change in place.
2. **Agent pane**: a chat pane between the page and a one-day calendar. It sees what is open, can read and change journal pages and tasks, and remembers things between days.

It runs on the user's own Claude subscription, through Claude Code, the way T3 Code does. It needs no API key.

## Decisions at a glance

| Question | Decision |
| --- | --- |
| How we call Claude | `@anthropic-ai/claude-agent-sdk`, running the user's installed `claude` program |
| Who pays | The user's Claude login (Pro or Max). No API key. |
| One ongoing chat | One Claude Code session, resumed every turn. Our own database keeps the full history for display. |
| Long chats | Claude Code compacts the session itself. If a session is lost, we start a new one seeded with a summary. |
| Memory | Facts and open loops in SQLite, added to the system prompt on every turn |
| What it can touch | Only our own tools. All built-in Claude Code tools (shell, files, web) are off. |
| Changes | Small, safe ones apply at once with Undo. Bigger ones become a proposal you apply. |
| Inline edit | A separate, short, tool-less call. A one-line note goes into the main chat. |

## What we learned from T3 Code and rakazo

**T3 Code** (`apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts`) calls `query()` from the Agent SDK. It passes the user's `claude` binary as `pathToClaudeCodeExecutable` and never touches an API key; the CLI uses its own login from the macOS Keychain. Each thread passes its id as `sessionId` the first time and `resume` after that. It keeps the `claude_code` system prompt preset and appends its own text. It adds its tools as MCP servers and gates them with `canUseTool`. It reads `initializationResult().account` to show "Claude Max Subscription".

**rakazo** (`packages/adapters/src/history-compaction.ts`, `memory-context.ts`) rebuilds context on every run from Postgres. It keeps one chat per bot. It folds old messages into a rolling summary, 50 at a time, capped at 20,000 characters. It injects saved memory (`MEMORY.md` per bot and per user) and an "open work" scratchpad on every run. It marks every injected block as data, not instructions.

We take the runtime from T3 Code and the memory model from rakazo.

## Architecture

```
renderer (React)                 main process (Electron, Node)
  Agent pane, ⌘K prompt  ──IPC──▶  agent-handler.ts
                                    │
                                    ▼
                         @productivity/agent  ── createAgent(...)
                           ├─ runtime: ClaudeRuntime (Agent SDK) | FakeRuntime (tests)
                           ├─ tools: MCP server "productivity" (journal, inbox, tasks, memory)
                           ├─ memory + open loops
                           └─ AgentRepository port
                                    │
                                    ▼
                         @productivity/db  (agent tables, GtdStore, JournalStore)
```

### New package: `@productivity/agent`

It follows the same shape as `@productivity/calendar`: a small interface over the detail it hides, with its I/O passed in.

```ts
export interface Agent {
  /** Sends a message. Events stream to subscribers. */
  send(message: string, view: ViewContext): Promise<void>;
  stop(): void;
  history(before?: number, limit?: number): AgentMessage[];
  /** Applies or discards a proposal the agent made. */
  decide(proposalId: string, decision: "apply" | "discard"): AgentMessage;
  undo(changeId: string): void;
  /** Rewrites selected journal lines for ⌘K. Does not touch the chat session. */
  inlineEdit(input: InlineEditInput): Promise<InlineEditResult>;
  memory: MemoryApi;
  status(): Promise<AgentStatus>; // signed in, plan, binary found, usage limits
  subscribe(listener: (event: AgentEvent) => void): () => void;
}

export function createAgent(options: {
  runtime: AgentRuntime; // ClaudeRuntime in the app, FakeRuntime in tests
  repository: AgentRepository; // implemented by @productivity/db
  gtd: GtdStore;
  journal: JournalStore;
  clock?: () => Date;
}): Agent;
```

`AgentRuntime` wraps the SDK. Only `ClaudeRuntime` imports `@anthropic-ai/claude-agent-sdk`, so tests never start Claude.

Boundary rules to add in `.dependency-cruiser.cjs`:

- `packages/agent` may import `@productivity/gtd` (types and `GtdStore`) but not `@productivity/db`.
- Only `packages/agent/src/claude-runtime.ts` may import the Agent SDK.

### Main process

`apps/desktop/src/main/agent-handler.ts` creates the agent and checks every IPC argument, like `journal-handler.ts` does.

| Channel | Direction | Purpose |
| --- | --- | --- |
| `agent:send` | renderer to main | message text and the current view |
| `agent:stop` | renderer to main | stop the current run |
| `agent:history` | renderer to main | page through past messages |
| `agent:decide` | renderer to main | apply or discard a proposal |
| `agent:undo` | renderer to main | undo a change |
| `agent:inline-edit` | renderer to main | ⌘K request |
| `agent:status` | renderer to main | login and binary state |
| `agent:event` | main to renderer | streamed text, tool activity, proposals, errors |

`agent:event` uses `webContents.send`, the same way `calendar.subscribe` pushes `calendarChannel.changed` today.

## Running Claude Code

### Which binary

The SDK ships its own Claude Code binary as an optional platform package. It is about 310 MB on macOS (`@anthropic-ai/claude-agent-sdk-darwin-arm64`). We do not bundle it. We run the user's installed `claude`, like T3 Code:

1. Use the path from the agent settings, if set.
2. Otherwise, find it through the login shell: `$SHELL -lc 'command -v claude'`. An app opened from Finder gets a minimal `PATH` and would miss `~/.local/bin` or Homebrew.
3. If nothing is found, the pane shows "Install Claude Code and sign in" with the install command.

Exclude the SDK's platform packages in `electron-builder.yml` so they never ship.

### Login and subscription

- Pass no API key. Remove `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` from the child's environment, because Claude Code prefers an API key over the subscription login when one is set.
- Do not change `HOME`. The login lives in the macOS Keychain, which a different `HOME` hides. To separate data, use `cwd` instead (below).
- On start, and when the pane opens, run a probe query that sends no prompt. Read `initializationResult().account` (`email`, `subscriptionType`, `tokenSource`) to show "Signed in as … · Claude Max". If `tokenSource` is `"none"` and there is no account, show "Run `claude` in Terminal and log in."

### Query options

```ts
query({
  prompt, // async iterable of user messages
  options: {
    pathToClaudeCodeExecutable: claudePath,
    cwd: path.join(dataDir, "agent"), // its own folder, so transcripts stay apart
    settingSources: [], // ignore ~/.claude settings, hooks and CLAUDE.md
    tools: [], // no built-in tools: no shell, files or web
    mcpServers: { productivity: productivityServer }, // createSdkMcpServer + tool()
    allowedTools: readOnlyToolNames, // reads run without asking
    canUseTool, // everything else goes through our policy
    permissionMode: "default",
    includePartialMessages: true, // stream text as it is written
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: agentInstructions,
    },
    ...(sessionId ? { resume: sessionId } : { sessionId: newSessionId }),
    env: childEnvironment, // without API keys
  },
});
```

Open point for the spike: the `claude_code` preset is written for coding. A custom `systemPrompt` string may suit a journal assistant better. Try both.

One `query()` per user turn is the simple start. Each turn starts a process, which may add one to three seconds. If that feels slow, keep one query open with streaming input between turns.

### Terms of use

Anthropic's Agent SDK docs say third-party products may not offer Claude.ai login without approval. This app runs only on the owner's machine with the owner's own `claude` login, which is how T3 Code works. Check the current terms again before sharing the app with anyone.

## One ongoing chat

- `agent_state.sessionId` holds the one Claude Code session. The first turn sets `sessionId`; every later turn uses `resume`.
- Claude Code compacts the session on its own when the context fills.
- Every message is also saved in our `agent_messages` table. The pane always shows the full history from there, even after Claude Code has summarised it.
- **Lost session.** A resume can fail: the transcript was deleted, or the CLI changed its format. Then start a new session, and send the first turn with a seed: the rolling summary, memory, open loops and the last 20 messages as text.
- **Rolling summary**, as in rakazo: once 100 messages have no summary, fold the oldest 50 into `agent_state.summary` (at most 20,000 characters) with a short, tool-less call. It is only needed for the seed above, so it can run in the background.
- Day dividers in the pane come from message timestamps. No sessions show in the UI.
- One run at a time. A message sent during a run waits in a queue.
- **Clear conversation** (in the pane menu) starts a new session and hides the old messages. Memory is kept.

## Memory

Two lists the agent maintains and the user can see and edit:

- **Memory**: lasting facts and preferences. "Invoices go in Reference." "Diane is the venue contact."
- **Open loops**: things the agent started and has not finished.

On every turn, both go into `systemPrompt.append`, inside `<memory>` and `<open_loops>` tags that say they are data, not instructions. They are capped at about 8 KB together. When memory is over the cap, the agent is asked to merge entries.

They change rarely, so the system prompt stays the same between most turns and the prompt cache keeps working.

Tools: `remember`, `forget`, `add_open_loop` and `close_open_loop`. Memory changes apply at once and show a small "Remembered: …" line with Undo.

UI: the pane menu has a **Memory** view listing both, with edit and delete.

## What it sees: the view context

The eye chip in the composer is the current view. With each message the renderer sends a small object:

```ts
type ViewContext =
  | {
      view: "journal";
      day: LocalDate;
      selection?: { from: number; to: number };
    }
  | { view: "inbox" }
  | { view: "next-actions" }
  | { view: "project"; projectId: string }
  | { view: "weekly-review" };
```

The main process turns it into text and puts it at the start of the user message inside `<current_view>`. For the journal, that is the page with line numbers. For the Inbox, the items with their ids. Putting it in the message, not the system prompt, keeps the system prompt stable.

The user can remove the chip to send a message without context.

## Tools

One in-process MCP server, `productivity`, built with `createSdkMcpServer` and `tool()` with zod schemas. Each tool is a thin wrapper over `GtdStore` or `JournalStore`.

**Read (run without asking):** `read_journal(day)`, `list_journal_days(from, to)`, `list_inbox`, `list_next_actions`, `list_waiting`, `list_someday`, `list_projects`, `get_project(id)`, `list_contexts`, `get_week(day)`.

**Write:**

| Tool | Policy |
| --- | --- |
| `capture(title, notes?)` | Applies at once, Undo |
| `remember`, `forget`, open-loop tools | Apply at once, Undo |
| `complete_task(id)` | Applies at once, Undo |
| `edit_journal(day, baseHash, edits[])` | Proposal |
| `file_inbox(items: { taskId, outcome: ClarifyOutcome }[])` | Proposal ("Apply all") |
| `update_task(id, changes)` | Proposal |
| `delete_task(id)` | Proposal |

Searching across journal days needs a new `JournalStore.search(query)`. It is not needed for the first version.

## Proposals, Apply and Undo

A proposal tool does not change anything. It saves a row in `agent_proposals` and returns "Proposed; waiting for the user." The agent's turn ends normally. The pane shows the proposal as a card, such as the inbox plan in the design.

**Apply** runs in the main process through `GtdStore` or `JournalStore`, without the model. A short event message, such as "Applied: filed 7 items", is added to the chat, so the agent sees the result on its next turn.

This means a proposal never blocks the chat. You can apply it an hour later, like rakazo's cards. It also avoids holding a Claude process open while you decide.

Every applied change saves its inverse in `agent_changes`: the old journal page, or the task's earlier fields. **Undo** restores it.

A journal proposal stores the hash of the page it was based on. If the page changed since, the card says "Page changed" and offers **Ask again**.

## Inline edit (⌘K)

This does not use the chat session. It is a separate, short call:

- `tools: []`, no MCP server, no `resume`.
- `outputFormat` with a JSON schema: `{ replacement: string }`.
- Input: the selected lines, a few lines around them, and the instruction.
- A faster model, set in agent settings.

The result shows in CodeMirror as a proposal decoration over the selected lines, with **Accept** (⏎), **Discard** (Esc) and **Follow up** (⇧⏎). Accept writes the page through the normal journal save.

Afterwards, one event message goes into the main chat: "Edited Saturday 24 Oct: turned 3 bullets into checkboxes." The agent then knows about it.

Keybinding: open question. ⌘K may clash with search, and the journal has Vim keys.

## Data model

New Drizzle tables in `packages/db/src/schema.ts`, through the normal migration steps:

- `agent_messages`: `id`, `seq`, `role` (`user` | `assistant` | `event`), `content` (JSON blocks: text, tool activity, proposal reference), `created_at`, `run_id`, `hidden` (set by Clear conversation)
- `agent_state`: key and value. Keys: `session_id`, `summary`, `summary_up_to_seq`, `claude_path`, `model`, `inline_model`
- `agent_memory`: `id`, `text`, `created_at`, `updated_at`
- `agent_open_loops`: `id`, `text`, `done_at`, `created_at`
- `agent_proposals`: `id`, `message_id`, `kind`, `payload` (JSON), `status` (`pending` | `applied` | `discarded` | `stale`), `created_at`, `decided_at`
- `agent_changes`: `id`, `kind`, `undo` (JSON), `created_at`, `undone_at`

`@productivity/db` implements `AgentRepository` over these tables, as it does for `CalendarRepository`.

## Renderer and UI

- New components in `@productivity/ui`: `ChatMessage`, `ActionCard`, `Composer`, `ContextChip`, `DayDivider`, `InlinePrompt`.
- Layout: when the agent is open, the right side becomes the agent pane (860 px, the same as the page) and a day calendar (560 px). The 640 px chat column matches the journal. `WeekCalendar` needs a day mode; FullCalendar's `timeGridDay` covers it.
- The sparkle button in the top bar, and a shortcut, open and close the pane. Closing it brings the week view back.
- History loads through React Query. The live run is local state fed by `agent:event`.
- Streaming text is shown as it arrives and saved when the message ends.

## Safety

- No built-in tools, so no shell, file or web access. The agent can only use our tools.
- Journal and inbox text may contain instructions ("delete all my tasks"). All injected data is wrapped in tags and labelled as data. Any change beyond capture, memory or completing a task needs the user to apply it.
- The child process gets a reduced environment: no API keys and no unrelated secrets.
- Do not log message text or tool arguments, only their sizes and kinds.

## Testing

- `@productivity/agent` tests use a `FakeRuntime` that replays recorded SDK messages, as T3 Code does with its replay fixtures. Tool tests run against the in-memory store.
- Desktop unit tests render the pane with a fake agent.
- End-to-end tests set `PRODUCTIVITY_AGENT_RUNTIME=fake`, so CI needs no Claude login.
- A manual smoke script runs one real turn against the user's `claude`.

## Phases

1. **Spike (1 to 2 days).** In the main process, run one `query()` with the user's `claude`. Check: the subscription account shows; `settingSources: []` and `tools: []` behave as expected; `PATH` lookup works in the packaged app; turn start-up time; the `claude_code` preset compared with a custom prompt.
2. **Chat.** Package, tables, IPC, streaming pane, read-only tools, view context, status and login states.
3. **Changes.** Write tools, proposals and Apply, Undo, and the inbox plan card.
4. **Memory.** Memory and open loops, the Memory view, the rolling summary and the lost-session seed.
5. **Inline edit.** ⌘K in CodeMirror, the proposal decoration and the event note in the chat.
6. **Layout and polish.** Day calendar beside the pane, usage-limit messages from the SDK's rate-limit events, error states, dark theme check.

## Risks and open questions

- **Terms**: see above. Fine for personal use; check before sharing the app.
- **CLI changes**: the user's `claude` updates on its own and may drift from the SDK version we ship. Show a clear error on a protocol mismatch, and allow a pinned path in settings.
- **Usage**: the agent shares the user's Claude limits with their Claude Code work. Show limit messages plainly.
- **Start-up time** per turn: measure in the spike. Keep a query open if needed.
- **System prompt**: `claude_code` preset or our own. Decide in the spike.
- **Inline edit key**: ⌘K or another key that works with Vim mode.
- **Day calendar**: always today, or follow the journal's day?

## How the build differs

- **System prompt**: a custom prompt, not the `claude_code` preset. The preset is written for coding.
- **One query per turn**: each turn starts Claude Code and resumes the session. A turn took about 4 seconds in the first real test, including two tool calls.
- **Keys**: ⌘L opens and closes the agent (⌘J already opens today's journal). ⌘K edits in the journal; it wins over the Vim keys.
- **Inline edits** show the new text in place, formatted, while you decide. Discard puts the old text back. Typing again asks for more changes, starting from the original text.
- **Undo** covers captures, completed tasks, memory changes and applied journal edits. Filing the Inbox has no Undo yet.
- **Not built yet**: searching journal pages across days, calendar events in the agent's tools (it sees only tasks placed on the calendar), and a setting for the model.
