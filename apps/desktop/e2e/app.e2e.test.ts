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

const launch = (
  dataDir: string,
  /**
   * Playwright pins prefers-color-scheme to light unless this is null,
   * which leaves it to the app's Theme setting.
   */
  colorScheme: "light" | null = "light"
): Promise<ElectronApplication> =>
  electron.launch({
    args: [appDir],
    colorScheme,
    cwd: appDir,
    env: childEnv({ PRODUCTIVITY_DATA_DIR: dataDir, PRODUCTIVITY_HIDDEN: "1" }),
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
    // The journal opens in vim's normal mode: "i" starts typing.
    await window.keyboard.press("i");
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

describe("the journal's vim keys", () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "productivity-e2e-"));
  let app: ElectronApplication;
  let window: Page;

  beforeAll(async () => {
    app = await launch(dataDir);
    window = await app.firstWindow();
    await window.getByRole("heading", { level: 1, name: "Inbox" }).waitFor();
    await window.keyboard.press("Meta+J");
    await window.getByRole("textbox", { name: /^Journal for /u }).waitFor();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dataDir, { force: true, recursive: true });
  });

  const mode = () =>
    window.getByRole("status", { name: "Vim mode" }).textContent();

  it("edits with vim keys and numbers lines from the cursor", async () => {
    await expect(mode()).resolves.toBe("normal");

    await window.keyboard.press("i");
    await expect(mode()).resolves.toBe("insert");
    await window.keyboard.type("One\nTwo\nThree");
    await window.keyboard.press("Escape");
    await expect(mode()).resolves.toBe("normal");

    // Up one line, then delete it.
    await window.keyboard.press("k");
    await window.keyboard.press("d");
    await window.keyboard.press("d");

    const page = window.getByRole("textbox", { name: /^Journal for /u });

    await expect(page.textContent()).resolves.toBe("OneThree");

    const numbers = await window
      .locator(".cm-lineNumbers .cm-gutterElement:not([style*='hidden'])")
      .allTextContents();

    // The cursor lands on "Three", the second line.
    expect(numbers).toStrictEqual(["1", "2"]);
  });
});

/** The middle of the grid cell for a day and a half-hour slot. */
const slotPoint = async (window: Page, day: string, time: string) => {
  // The grid opens scrolled to the current hour, so late in the day the
  // slot can be above the fold.
  await window
    .locator(`[data-time="${time}"]`)
    .first()
    .scrollIntoViewIfNeeded();

  const lane = await window
    .locator(`[data-date="${day}"]:not([data-time] *)`)
    .last()
    .boundingBox();

  const slot = await window
    .locator(`[data-time="${time}"]`)
    .first()
    .boundingBox();

  if (lane === null || slot === null) {
    throw new Error(`No grid cell for ${day} at ${time}.`);
  }

  return {
    x: lane.x + lane.width / 2,
    y: slot.y + slot.height / 2,
  };
};

describe("the calendar", () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "productivity-e2e-"));

  afterAll(() => {
    rmSync(dataDir, { force: true, recursive: true });
  });

  it("creates an event from a click and keeps it after a restart", async () => {
    const first = await launch(dataDir);
    const window = await first.firstWindow();
    const week = window.getByRole("complementary", { name: "Week" });

    await week
      .locator(`[data-time="10:00:00"]`)
      .first()
      .waitFor({ state: "attached" });

    const today = await window.evaluate(() => {
      const now = new Date();

      return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");
    });

    // The demo week is busy at 10 AM most days, but free at 7 AM every day.
    const point = await slotPoint(window, today, "07:00:00");

    await window.mouse.click(point.x, point.y);

    const dialog = window.getByRole("dialog", { name: "New event" });

    await dialog.getByRole("textbox", { name: "Title" }).fill("Plant trees");
    await dialog.getByRole("button", { name: "Save" }).click();
    await week.getByText("Plant trees").waitFor();
    await first.close();

    const second = await launch(dataDir);
    const reopened = await second.firstWindow();

    const kept = reopened
      .getByRole("complementary", { name: "Week" })
      .getByText("Plant trees");

    await kept.waitFor();

    await expect(kept.count()).resolves.toBe(1);

    await second.close();
  });
});

/** The window's background, which the design tokens set per theme. */
const background = (window: Page) =>
  window
    .getByRole("main")
    .evaluate(
      (main) => getComputedStyle(main.parentElement ?? main).backgroundColor
    );

const isDark = (window: Page) =>
  window.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);

describe("the theme", () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "productivity-e2e-"));

  afterAll(() => {
    rmSync(dataDir, { force: true, recursive: true });
  });

  it("turns dark, and stays dark after a restart", async () => {
    const first = await launch(dataDir, null);
    const window = await first.firstWindow();
    const theme = window.getByRole("group", { name: "Theme" });

    await theme.getByRole("button", { name: "Light" }).click();
    await expect.poll(() => isDark(window)).toBeFalsy();
    await expect.poll(() => background(window)).toBe("rgb(255, 255, 255)");

    await theme.getByRole("button", { name: "Dark" }).click();
    await expect.poll(() => isDark(window)).toBeTruthy();
    await expect.poll(() => background(window)).toBe("rgb(25, 25, 25)");
    await first.close();

    const second = await launch(dataDir, null);
    const reopened = await second.firstWindow();

    await reopened.getByRole("heading", { level: 1, name: "Inbox" }).waitFor();

    await expect(isDark(reopened)).resolves.toBeTruthy();
    await expect(
      reopened
        .getByRole("group", { name: "Theme" })
        .getByRole("button", { name: "Dark" })
        .getAttribute("aria-pressed")
    ).resolves.toBe("true");

    await second.close();
  });
});
