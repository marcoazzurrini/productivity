import { afterEach } from "bun:test";

import { GlobalRegistrator } from "@happy-dom/global-registrator";

import { compileStylex } from "../testing/stylex.ts";

GlobalRegistrator.register();

const sourceFile = /\/packages\/ui\/src\/.*\.tsx?$/u;

// Bun has no StyleX transform of its own, so compile the package's source.
Bun.plugin({
  name: "stylex",
  setup(build) {
    build.onLoad({ filter: sourceFile }, async ({ path: file }) => ({
      contents: await compileStylex(await Bun.file(file).text(), file),
      loader: file.endsWith(".tsx") ? "tsx" : "ts",
    }));
  },
});

// Imported after the DOM exists, because Testing Library reads it on load.
const { cleanup } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});
