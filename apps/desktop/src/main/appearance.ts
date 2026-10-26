import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { isTheme } from "../shared/appearance.ts";
import type { Theme } from "../shared/appearance.ts";

export class InvalidThemeError extends TypeError {
  constructor() {
    super('A theme must be "system", "light" or "dark".');
    this.name = "InvalidThemeError";
  }
}

/** Theme calls arrive from the renderer untyped, so they are checked here. */
export const checkTheme: (args: unknown[]) => asserts args is [Theme] = (
  args
) => {
  if (args.length !== 1 || !isTheme(args[0])) {
    throw new InvalidThemeError();
  }
};

/** The saved theme. A missing or damaged file means "system". */
export const readTheme = (file: string): Theme => {
  try {
    const saved = readFileSync(file, "utf-8").trim();

    return isTheme(saved) ? saved : "system";
  } catch {
    return "system";
  }
};

/** Saves the theme as one word, such as "dark". */
export const writeTheme = (file: string, theme: Theme): void => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${theme}\n`);
};
