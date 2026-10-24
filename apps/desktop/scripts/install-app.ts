import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Builds Productivity.app and installs it in /Applications, replacing the
 * previous version. The database lives outside the app, in
 * ~/Library/Application Support/Productivity, so it survives every install.
 * It is still backed up first, in case a new version changes the schema.
 *
 * Usage: bun run install-app [--open]
 */
import { $ } from "bun";

const appName = "Productivity";
const appDir = path.resolve(import.meta.dir, "..");
const builtApp = path.join(appDir, "release", "mac-arm64", `${appName}.app`);
const installedApp = path.join("/Applications", `${appName}.app`);
const dataDir = path.join(homedir(), "Library", "Application Support", appName);
const backupsDir = path.join(dataDir, "backups");

const databaseFiles = [
  "productivity.sqlite",
  "productivity.sqlite-wal",
  "productivity.sqlite-shm",
];

const backupsToKeep = 10;

const step = (message: string): void => {
  process.stdout.write(`\n→ ${message}\n`);
};

const isRunning = async (): Promise<boolean> => {
  const result = await $`pgrep -x ${appName}`.quiet().nothrow();

  return result.exitCode === 0;
};

/** Polls every 200 ms, for up to 10 seconds, until the app has exited. */
const waitUntilQuit = async (attemptsLeft = 50): Promise<boolean> => {
  if (!(await isRunning())) {
    return true;
  }

  if (attemptsLeft === 0) {
    return false;
  }

  await Bun.sleep(200);

  return waitUntilQuit(attemptsLeft - 1);
};

/** Asks the app to quit, so SQLite finishes writing before anything is copied. */
const quitApp = async (): Promise<void> => {
  if (!(await isRunning())) {
    return;
  }

  step(`Quitting ${appName}`);
  await $`osascript -e ${`quit app "${appName}"`}`.quiet().nothrow();

  if (!(await waitUntilQuit())) {
    throw new Error(
      `${appName} did not quit. Close it and run the script again.`
    );
  }
};

/** Copies the database into backups/<timestamp>/ and keeps the newest few. */
const backUpDatabase = (): string | null => {
  if (!existsSync(path.join(dataDir, databaseFiles[0] ?? ""))) {
    return null;
  }

  // Local time, so folder names match the clock: 2026-10-24 09-30-05.
  const stamp = new Date().toLocaleString("sv-SE").replaceAll(":", "-");
  const target = path.join(backupsDir, stamp);

  mkdirSync(target, { recursive: true });

  for (const file of databaseFiles) {
    const source = path.join(dataDir, file);

    if (existsSync(source)) {
      cpSync(source, path.join(target, file));
    }
  }

  const old = readdirSync(backupsDir)
    .toSorted()
    .toReversed()
    .slice(backupsToKeep);

  for (const folder of old) {
    rmSync(path.join(backupsDir, folder), { force: true, recursive: true });
  }

  return target;
};

if (process.platform !== "darwin") {
  throw new Error("install-app builds the macOS app and only runs on a Mac.");
}

step("Building");

await $`bunx electron-vite build`.cwd(appDir);

await $`bunx electron-builder --mac --dir`.cwd(appDir);

await quitApp();

step("Backing up your tasks");

const backup = backUpDatabase();

process.stdout.write(
  backup === null
    ? "No database yet, nothing to back up.\n"
    : `Saved to ${backup}\n`
);

step(`Installing ${installedApp}`);

rmSync(installedApp, { force: true, recursive: true });

await $`ditto ${builtApp} ${installedApp}`;

process.stdout.write(
  `\n✓ ${appName} is installed. Your data stays in ${dataDir}\n`
);

if (process.argv.includes("--open")) {
  // `open` passes this shell's environment to the app. With
  // ELECTRON_RUN_AS_NODE set, Electron would start as plain Node and quit.
  const { ELECTRON_RUN_AS_NODE: _, ...env } = process.env;

  await $`open ${installedApp}`.env(env);
}
