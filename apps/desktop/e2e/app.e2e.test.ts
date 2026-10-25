import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import electronPath from "electron";
import { _electron as electron } from "playwright";
import type { ElectronApplication, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const appDir = path.resolve(import.meta.dirname, "..");

/**
 * The test's environment, minus ELECTRON_RUN_AS_NODE: some terminals and
 * editors set it, and it would start Electron as plain Node.
 */
const childEnv = (extra: Record<string, string>) => ({
  ...Object.fromEntries(
    Object.entries(process.env).flatMap(([key, value]) =>
      value === undefined || key === "ELECTRON_RUN_AS_NODE"
        ? []
        : [[key, value]]
    )
  ),
  ...extra,
});

const launch = (dataDir: string): Promise<ElectronApplication> =>
  electron.launch({
    args: [appDir],
    cwd: appDir,
    env: childEnv({ PRODUCTIVITY_DATA_DIR: dataDir }),
    executablePath: String(electronPath),
  });

describe("the built app", () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "productivity-e2e-"));
  let app: ElectronApplication;
  let window: Page;

  beforeAll(async () => {
    app = await launch(dataDir);
    window = await app.firstWindow();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dataDir, { force: true, recursive: true });
  });

  it("opens on the Inbox with sample data", async () => {
    await window.getByRole("heading", { level: 1, name: "Inbox" }).waitFor();

    await expect(
      window.getByRole("region", { name: "7 items to clarify" }).count()
    ).resolves.toBe(1);
  });

  it("captures with ⌘N through the real IPC bridge", async () => {
    await window.keyboard.press("Meta+N");
    await window
      .getByRole("textbox", { name: "What's on your mind?" })
      .fill("Water the plants");
    await window.keyboard.press("Enter");
    await window.getByText("Water the plants", { exact: true }).waitFor();

    await expect(
      window.getByRole("region", { name: "8 items to clarify" }).count()
    ).resolves.toBe(1);
  });
});

describe("the journal", () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "productivity-e2e-"));

  afterAll(() => {
    rmSync(dataDir, { force: true, recursive: true });
  });

  it("keeps what was typed right before quitting", async () => {
    const first = await launch(dataDir);
    const window = await first.firstWindow();

    await window.getByRole("heading", { level: 1, name: "Inbox" }).waitFor();
    await window.keyboard.press("Meta+J");

    const page = window.getByRole("textbox", { name: /^Journal for /u });

    await page.waitFor();
    await window.keyboard.type("## Evening\nWritten right before quitting");
    // Quit at once, before the pause that triggers a normal save.
    await first.close();

    const second = await launch(dataDir);
    const reopened = await second.firstWindow();

    await reopened.getByRole("heading", { level: 1, name: "Inbox" }).waitFor();
    await reopened.keyboard.press("Meta+J");
    await reopened.getByText("Written right before quitting").waitFor();

    await expect(
      reopened.getByRole("heading", { level: 1 }).textContent()
    ).resolves.toMatch(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d+$/u);

    await second.close();
  });
});
