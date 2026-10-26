import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  InvalidThemeError,
  checkTheme,
  readTheme,
  writeTheme,
} from "../src/main/appearance.ts";

describe("theme calls over IPC", () => {
  it.each([["system"], ["light"], ["dark"]])("accepts %s", (theme) => {
    expect(() => {
      checkTheme([theme]);
    }).not.toThrow();
  });

  it.each([[[]], [["Dark"]], [["dark", "light"]], [[null]], [[{}]]])(
    "refuses %j",
    (args) => {
      expect(() => {
        checkTheme(args);
      }).toThrow(InvalidThemeError);
    }
  );
});

describe("the saved theme", () => {
  const dirs: string[] = [];

  const fileIn = (): string => {
    const dir = mkdtempSync(path.join(tmpdir(), "productivity-theme-"));

    dirs.push(dir);

    return path.join(dir, "settings", "theme");
  };

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("follows the system until a theme is chosen", () => {
    expect(readTheme(fileIn())).toBe("system");
  });

  it("keeps the chosen theme", () => {
    const file = fileIn();

    writeTheme(file, "dark");

    expect(readTheme(file)).toBe("dark");
    expect(readFileSync(file, "utf-8")).toBe("dark\n");
  });

  it.each([["sepia"], ["Dark"], [""], ['{"theme":"dark"}']])(
    "follows the system when the file holds %s",
    (text) => {
      const file = fileIn();

      writeTheme(file, "light");
      writeFileSync(file, text);

      expect(readTheme(file)).toBe("system");
    }
  );
});
