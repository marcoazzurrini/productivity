import { defineConfig } from "vitest/config";

// Runs against the built app in out/, so build first: bun run test:e2e.
export default defineConfig({
  test: {
    environment: "node",
    include: ["e2e/**/*.e2e.test.ts"],
    testTimeout: 30_000,
  },
});
