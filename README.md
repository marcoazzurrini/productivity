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
  db/        SQLite storage for GtdStore, the journal and the calendar, with Drizzle ORM
  ui/        Design tokens and components (StyleX on Base UI)
.penna/      penna design: one JSON file per page
```

Each package is a deep module: a small public interface over the detail it hides.

- **`@productivity/gtd`** knows the method: the Clarify questions and their order, grouping Next Actions by context, the Upcoming tickler, follow-ups for Waiting For, and the Weekly Review. It has no dependencies. It also defines `GtdStore`, the one interface the app uses for data.
- **`@productivity/calendar`** owns events: checking times, storing timed events as UTC instants, which calendars may change, and two-way sync with Google Calendar (sign-in, sync tokens, conflicts, offline changes). Its interface is `createCalendar`, which returns a `Calendar` with nine methods. It stores data through the `CalendarRepository` port and reaches Google only through an injected `fetch`, so its tests run against an in-memory fake of Google.
- **`@productivity/db`** implements `GtdStore`, `JournalStore` and `CalendarRepository` with Drizzle ORM on `node:sqlite`, which runs both under Bun (tests) and in Electron. One database file holds both. Schema, migrations, IDs and the clock stay inside.
- **`@productivity/ui`** knows nothing about GTD. Its `WeekCalendar` wraps [FullCalendar](https://fullcalendar.io) v7: click or drag to create, drag to move, drag the bottom edge to resize. Every token has a light and a dark value, switched by `prefers-color-scheme`, and every text color meets WCAG AA contrast in both. Its `MarkdownEditor` (CodeMirror) shows Markdown formatted, with raw syntax only on the line being edited.
- **`apps/desktop`** connects them. The renderer reaches the database only through IPC: one channel that accepts nothing but `GtdStore` methods, and one per journal operation, whose arguments the main process checks, one that accepts nothing but `Calendar` methods, and two for the Theme setting, which the main process saves and applies through Electron's `nativeTheme`.

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

Run it again whenever you want the latest version. It quits the running app, backs up the database, and replaces the app. There is no installer, code signing or auto-update: the app is built for this Mac only.

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

## Data

The packaged app stores its database in Electron's user-data folder. Development uses a separate `productivity-dev.sqlite` filled with sample data. Set `PRODUCTIVITY_DATA_DIR` to use another folder.

If your terminal sets `ELECTRON_RUN_AS_NODE=1`, unset it before `bun run dev`, or Electron starts as plain Node.
