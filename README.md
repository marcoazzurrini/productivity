# Productivity

A desktop task manager for [Getting Things Done](https://gettingthingsdone.com), with a week calendar beside your lists. The design lives in `.penna/` ([penna](https://github.com/marcoazzurrini/penna)).

## Layout

```
apps/
  desktop/   Electron app: main process, preload bridge, React renderer
  demo/      Storybook for the design system
packages/
  gtd/       The GTD method as pure functions, plus the GtdStore contract
  calendar/  Calendars and events, and two-way sync with Google Calendar
  agent/     The AI agent: one ongoing conversation, its tools and memory
  db/        SQLite storage for GtdStore, the journal and the calendar, with Drizzle ORM
  ui/        Design tokens and components (StyleX on Base UI)
.penna/      penna design: one JSON file per page
```

Each package is a deep module: a small public interface over the detail it hides.

- **`@productivity/gtd`** knows the method: the Clarify questions and their order, grouping Next Actions by context, the Upcoming tickler, follow-ups for Waiting For, headings that group a project's to-dos, and the Weekly Review. It has no dependencies. It also defines `GtdStore`, the one interface the app uses for data.
- **`@productivity/calendar`** owns events: checking times, storing timed events as UTC instants, which calendars may change, and two-way sync with Google Calendar (sign-in, sync tokens, conflicts, offline changes). Its interface is `createCalendar`, which returns a `Calendar` with nine methods. It stores data through the `CalendarRepository` port and reaches Google only through an injected `fetch`, so its tests run against an in-memory fake of Google.
- **`@productivity/agent`** is the app's one AI agent. `createAgent` returns an `Agent`: a single conversation that never needs creating or deleting, memory it keeps between days, tools over `GtdStore` and the journal, and proposals the user applies or discards. It runs the model through an injected `AgentRuntime`: `createClaudeRuntime` (from `@productivity/agent/claude`) drives the user's own Claude Code with the Agent SDK, so their Claude subscription pays and no API key is needed; `createScriptedRuntime` plays back a script for tests. See [docs/agent-plan.md](docs/agent-plan.md).
- **`@productivity/db`** implements `GtdStore`, `JournalStore`, `AgentRepository` and `CalendarRepository` with Drizzle ORM on `node:sqlite`, which runs both under Bun (tests) and in Electron. One database file holds both. Schema, migrations, IDs and the clock stay inside.
- **`@productivity/ui`** knows nothing about GTD. Its `WeekCalendar` wraps [FullCalendar](https://fullcalendar.io) v7: day, week and month views; click or drag to create, drag to move, drag the bottom edge to resize. Every token has a light and a dark value, switched by `prefers-color-scheme`, and every text color meets WCAG AA contrast in both. Its `MarkdownEditor` (CodeMirror) shows Markdown formatted, with raw syntax only on the line being edited.
- **`apps/desktop`** connects them. The renderer reaches the database only through IPC: one channel that accepts nothing but `GtdStore` methods, and one per journal operation, whose arguments the main process checks, one that accepts nothing but `Calendar` methods, one that accepts nothing but `Agent` methods with checked arguments (and pushes the agent's events back), and two for the Theme setting, which the main process saves and applies through Electron's `nativeTheme`.

`dependency-cruiser` enforces these boundaries (`bun run boundaries`).

### Changing the database schema

1. Edit `packages/db/src/schema.ts`.
2. Run `bun run --filter @productivity/db db:generate`. Drizzle Kit writes the SQL to `packages/db/migrations/`, and the script copies it into `src/migrations.ts`, because the bundled app has no migrations folder.
3. Commit both. The app applies new migrations on its next start and keeps existing data.

Never edit a migration that has shipped. Add a new one instead.

## Commands

```sh
bun install                 # also installs the git hooks
bun run dev                 # the desktop app, with hot reload
bun run --filter @productivity/demo dev   # Storybook on port 6006
bun run check               # format, lint, boundaries, typecheck, tests
bun run test:e2e            # build the app and drive the real window
npx @marcoazzurrini/penna   # the design, view-only, on port 6060
```

Packages test with `bun test`. The desktop app tests with Vitest: unit tests render the whole app on an in-memory database, and end-to-end tests drive the built Electron app through Playwright.

## Git hooks

Lefthook runs on every commit: oxfmt, oxlint (Ultracite presets with anti-slop) and typecheck. On push it runs boundaries, all tests and the end-to-end suite.

## Pull requests

`main` is protected: every change lands through a pull request, rebased onto `main`. CI (`.github/workflows/ci.yml`) must pass first:

- **Checks**: format, lint, boundaries, typecheck, tests and build, on Linux.
- **End-to-end**: builds the app and drives the real window, on macOS.

## Installing on your Mac

```sh
bun run install-app          # build and install /Applications/Productivity.app
bun run install-app --open   # the same, then open it
```

Run it again whenever you want the latest version. It quits the running app, backs up the database, and replaces the app. There is no installer, notarization or auto-update: the app is built for this Mac only.

The script signs the app with your free "Apple Development" certificate. macOS lets each new build read the app's keychain items, such as the key that protects the Google sign-in, only when the builds share an Apple team. Without a team, every build looks like a new app and the Google sign-in is lost. To get the certificate once:

1. Install Xcode from the App Store.
2. In Xcode, open **Settings → Apple Accounts** and sign in with your Apple ID.
3. Open your **Personal Team**, click **Manage Certificates…**, then **+** and **Apple Development**.

If `security find-identity -v -p codesigning` does not list it as valid, install Apple's current intermediate certificate, `AppleWWDRCAG3.cer`, from [Apple's certificate authority page](https://www.apple.com/certificateauthority/).

The app icon is `apps/desktop/resources/icon.svg`, built from the logo in `apps/desktop/resources/logo.svg`. After editing it, run `bun run --filter @productivity/desktop make-icon` to rebuild `icon.icns`, then reinstall.

## Google Calendar

The calendar works on its own. To sync it with Google Calendar, give the app a Google OAuth client:

1. In the [Google Cloud console](https://console.cloud.google.com), create a project and enable the **Google Calendar API**.
2. On the OAuth consent screen, add yourself as a test user and add the scopes `calendar.calendarlist.readonly` and `calendar.events`.
3. Create an OAuth client ID of type **Desktop app**.
4. Put its ID and secret in `apps/desktop/.env.local`, which git ignores:

   ```sh
   MAIN_VITE_GOOGLE_CLIENT_ID=1234-abc.apps.googleusercontent.com
   MAIN_VITE_GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```

5. Restart `bun run dev`, or run `bun run install-app` again. A Google button appears in the calendar's header.

Sign-in opens your browser and returns to a one-time listener on `127.0.0.1`. The app keeps only the refresh token, encrypted with the macOS keychain, in its data folder. It syncs every 2 minutes, when the window gets focus, and shortly after each change. When both sides changed an event, Google's version wins.

Limits:

- While the consent screen is in "Testing", Google may expire the sign-in after 7 days. Connect again, or publish the app.
- Repeating events from Google appear and can be changed one at a time. The app cannot create repeating events.
- Disconnecting removes Google's events from the app, including changes not yet synced.

## The agent

The sparkle button in any page's top bar, or ⌘L, opens the agent beside the page, and the week shrinks to today. It is one ongoing conversation: there are no chats to create or delete. It sees the page in the middle, and it can read your lists and journal, add to the Inbox, and propose journal edits and Inbox filing for you to apply. In the journal, ⌘K rewrites the lines around the cursor or the selection.

It runs on your own Claude subscription, through Claude Code:

1. Install [Claude Code](https://claude.com/code) and run `claude` once in Terminal to sign in.
2. Open the agent. It finds `claude` through your login shell, or in the usual install folders. Set `PRODUCTIVITY_CLAUDE` to a path to use another one.

The app never uses an API key: it removes `ANTHROPIC_API_KEY` from Claude Code's environment, so your subscription pays. Claude Code gets none of its own tools (no shell, files or web), only the app's, and none of your `~/.claude` settings. Its transcripts go in the `agent` folder inside the app's data folder. Anthropic's terms limit offering Claude.ai login in third-party products; this app only runs your own login on your own Mac.

## Data

The installed app keeps everything in `~/Library/Application Support/Productivity`: the database (with the agent's conversation and memory), the Google sign-in, the Theme setting, Claude Code's working folder for the agent, and Electron's own storage. Development uses its own `Productivity Dev` folder beside it, with a database filled with sample data, so it never shares a file with the installed app. Set `PRODUCTIVITY_DATA_DIR` to use another folder.

If your terminal sets `ELECTRON_RUN_AS_NODE=1`, unset it before `bun run dev`, or Electron starts as plain Node.
