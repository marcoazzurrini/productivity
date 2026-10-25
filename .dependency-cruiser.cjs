/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      comment:
        "Resolve package exports instead of reaching into private source.",
      from: {},
      name: "no-unresolved-imports",
      severity: "error",
      to: { couldNotResolve: true },
    },
    {
      from: {},
      name: "no-undeclared-external-dependencies",
      severity: "error",
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
    {
      comment: "Cross-workspace imports must use a public package entrypoint.",
      from: { path: "^((?:apps|packages)/[^/]+)/" },
      name: "no-relative-cross-workspace-imports",
      severity: "error",
      to: { dependencyTypes: ["local"], pathNot: "^$1/" },
    },
    {
      from: { path: "^packages/" },
      name: "packages-cannot-import-apps",
      severity: "error",
      to: { path: "^apps/" },
    },
    {
      comment: "The GTD rules are pure: no other workspace, no Node built-ins.",
      from: { path: "^packages/gtd/src/" },
      name: "gtd-is-independent",
      severity: "error",
      to: {
        dependencyTypes: ["core"],
        path: ".",
      },
    },
    {
      from: { path: "^packages/gtd/" },
      name: "gtd-has-no-workspace-dependencies",
      severity: "error",
      to: { path: "^packages/", pathNot: "^packages/gtd/" },
    },
    {
      from: { path: "^packages/db/" },
      name: "db-only-depends-on-gtd",
      severity: "error",
      to: { path: "^packages/", pathNot: "^packages/(db|gtd)/" },
    },
    {
      comment: "The design system knows nothing about GTD or storage.",
      from: { path: "^packages/ui/" },
      name: "ui-is-independent",
      severity: "error",
      to: { path: "^packages/", pathNot: "^packages/ui/" },
    },
    {
      comment:
        "The renderer is a browser: it reaches data only through the preload bridge.",
      from: { path: "^apps/desktop/src/renderer/" },
      name: "renderer-stays-in-the-browser",
      severity: "error",
      to: {
        path: "^packages/db/|^apps/desktop/src/(main|preload)/|(^|/)electron(/|$)",
      },
    },
    {
      comment:
        "Shared code also runs in the renderer and preload: it may use the database's types, never its code.",
      from: { path: "^apps/desktop/src/shared/" },
      name: "shared-uses-only-db-types",
      severity: "error",
      to: { dependencyTypesNot: ["type-only"], path: "^packages/db/" },
    },
    {
      from: { path: "^apps/desktop/src/renderer/" },
      name: "renderer-cannot-use-node",
      severity: "error",
      to: { dependencyTypes: ["core"], pathNot: "^virtual:" },
    },
    {
      comment: "Storybook shows the design system, not the product's data.",
      from: { path: "^apps/demo/" },
      name: "demo-only-shows-ui",
      severity: "error",
      to: { path: "^packages/", pathNot: "^packages/ui/" },
    },
    {
      from: {
        pathNot:
          "\\.(test|stories)\\.[cm]?[jt]sx?$|^(apps|packages)/[^/]+/tests/",
      },
      name: "test-infrastructure-stays-in-tests",
      severity: "error",
      to: { path: "^(apps|packages)/[^/]+/tests/|\\.test\\.[cm]?[jt]sx?$" },
    },
  ],
  options: {
    // Bun runtime modules, and the StyleX dev runtime that Vite serves virtually.
    builtInModules: {
      add: ["bun", "bun:test", "bun:sqlite", "virtual:stylex:runtime"],
    },
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: {
      conditionNames: ["import", "require", "node", "default"],
      exportsFields: ["exports"],
    },
    exclude: {
      path: "^(apps|packages)/[^/]+/(out|dist|release|storybook-static|\\.cache)/",
    },
    tsPreCompilationDeps: true,
  },
};
