import { compileStylex } from "@productivity/ui/testing/stylex";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      name: "stylex-for-tests",
      transform: (code, id) =>
        /\.tsx?$/u.test(id) && !id.includes("/node_modules/")
          ? compileStylex(code, id)
          : undefined,
    },
    react(),
  ],
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 15_000,
  },
});
