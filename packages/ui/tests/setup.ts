import { afterEach } from "bun:test";
import path from "node:path";

import { transformAsync } from "@babel/core";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import stylexBabel from "@stylexjs/babel-plugin";

GlobalRegistrator.register();

const packageRoot = path.resolve(import.meta.dir, "..");
const sourceFile = /\/packages\/ui\/src\/.*\.tsx?$/u;

/**
 * StyleX must be compiled before it runs. Bun has no StyleX transform of its
 * own, so this compiles the package's source with StyleX's Babel plugin and
 * injects the CSS at runtime, as the bundler does in the apps.
 */
Bun.plugin({
  name: "stylex",
  setup(build) {
    build.onLoad({ filter: sourceFile }, async ({ path: file }) => {
      const source = await Bun.file(file).text();
      const loader = file.endsWith(".tsx") ? "tsx" : "ts";

      if (!source.includes("@stylexjs/stylex")) {
        return { contents: source, loader };
      }

      const result = await transformAsync(source, {
        babelrc: false,
        configFile: false,
        // Plugins named as strings resolve from the package root.
        cwd: packageRoot,
        filename: file,
        plugins: [
          ["@babel/plugin-syntax-typescript", { isTSX: loader === "tsx" }],
          "@babel/plugin-syntax-jsx",
          [
            stylexBabel,
            {
              dev: true,
              runtimeInjection: true,
              unstable_moduleResolution: {
                rootDir: packageRoot,
                type: "commonJS",
              },
            },
          ],
        ],
      });

      return { contents: result?.code ?? source, loader };
    });
  },
});

// Imported after the DOM exists, because Testing Library reads it on load.
const { cleanup } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});
