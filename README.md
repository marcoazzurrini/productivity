# Productivity

A desktop task manager for [Getting Things Done](https://gettingthingsdone.com), with a week calendar beside your lists. The design lives in `.penna/` ([penna](https://github.com/marcoazzurrini/penna)).

## Layout

```
apps/
  desktop/   Electron app: main process, preload bridge, React renderer
  demo/      Storybook for the design system
packages/
  gtd/       The GTD method as pure functions, plus the GtdStore contract
  db/        SQLite implementation of GtdStore, with Drizzle ORM
  ui/        Design tokens and components (StyleX on Base UI)
.penna/      penna design: one JSON file per page
```

Each package is a deep module: a small public interface over the detail it hides.

- **`@productivity/gtd`** knows the method: the Clarify questions and their order, grouping Next Actions by context, the Upcoming tickler, follow-ups for Waiting For, and the Weekly Review. It has no dependencies. It also defines `GtdStore`, the one interface the app uses for data.
- **`@productivity/db`** implements `GtdStore` with Drizzle ORM on `node:sqlite`, which runs both under Bun (tests) and in Electron. Schema, migrations, IDs and the clock stay inside.
- **`@productivity/ui`** knows nothing about GTD. Every text color meets WCAG AA contrast.
- **`apps/desktop`** connects them. The renderer reaches the database only through one IPC channel, which accepts nothing but `GtdStore` methods.

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

## Data

The packaged app stores its database in Electron's user-data folder. Development uses a separate `productivity-dev.sqlite` filled with sample data. Set `PRODUCTIVITY_DATA_DIR` to use another folder.

If your terminal sets `ELECTRON_RUN_AS_NODE=1`, unset it before `bun run dev`, or Electron starts as plain Node.
