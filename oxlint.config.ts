import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, antiSlop],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "**/out/**",
    "**/release/**",
    "**/storybook-static/**",
    ".penna/**",
  ],
  // Only the desktop app runs Vitest; packages use Bun's test runner.
  overrides: (vitest.overrides ?? []).map((override) => ({
    ...override,
    files: override.files.map((pattern) => `apps/desktop/${pattern}`),
  })),
});
