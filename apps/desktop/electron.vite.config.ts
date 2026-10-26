import stylex from "@stylexjs/unplugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

// Workspace packages ship TypeScript source, so they are bundled rather than
// loaded from node_modules at runtime.
const workspacePackages = [
  "@productivity/calendar",
  "@productivity/db",
  "@productivity/gtd",
  "@productivity/ui",
];

export default defineConfig({
  main: {
    build: { externalizeDeps: { exclude: workspacePackages } },
  },
  preload: {
    build: {
      externalizeDeps: { exclude: workspacePackages },
      // Sandboxed preload scripts must be CommonJS.
      rollupOptions: {
        output: { entryFileNames: "[name].cjs", format: "cjs" },
      },
    },
  },
  renderer: {
    plugins: [stylex({ useCSSLayers: true }), react()],
  },
});
