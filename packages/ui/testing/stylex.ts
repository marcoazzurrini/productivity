import path from "node:path";

import { transformAsync } from "@babel/core";
import stylexBabel from "@stylexjs/babel-plugin";

const packageRoot = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(packageRoot, "../..");

/**
 * Compiles StyleX in one source file and injects its CSS at runtime. Test
 * runners use it in place of the bundler plugin, which keeps dev servers
 * alive and is not needed when nobody looks at the pixels.
 */
export const compileStylex = async (
  source: string,
  filename: string
): Promise<string> => {
  if (!source.includes("@stylexjs/stylex")) {
    return source;
  }

  const result = await transformAsync(source, {
    babelrc: false,
    configFile: false,
    // Plugins named as strings resolve from this package.
    cwd: packageRoot,
    filename,
    plugins: [
      ["@babel/plugin-syntax-typescript", { isTSX: filename.endsWith(".tsx") }],
      "@babel/plugin-syntax-jsx",
      [
        stylexBabel,
        {
          dev: true,
          runtimeInjection: true,
          unstable_moduleResolution: {
            rootDir: repositoryRoot,
            type: "commonJS",
          },
        },
      ],
    ],
  });

  return result?.code ?? source;
};
