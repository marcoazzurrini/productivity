import path from "node:path";

import { openStore } from "@productivity/db";
import { app, BrowserWindow, ipcMain, shell } from "electron";

import { storeChannel } from "../shared/channel.ts";
import { canOpenExternally } from "./external-links.ts";
import { callStore } from "./store-handler.ts";

const isDev = !app.isPackaged;

// Development uses its own database filled with sample data, so trying the
// app never touches real tasks.
/**
 * Where the database lives: ~/Library/Application Support/Productivity on
 * macOS. Pinned by name, so renaming the app never moves or loses the data,
 * and outside the app bundle, so reinstalling never touches it.
 * PRODUCTIVITY_DATA_DIR lets end-to-end tests use a throwaway folder.
 */
const dataDir =
  process.env.PRODUCTIVITY_DATA_DIR ??
  path.join(app.getPath("appData"), "Productivity");

const store = openStore({
  path: path.join(
    dataDir,
    isDev ? "productivity-dev.sqlite" : "productivity.sqlite"
  ),
  sample: isDev,
});

ipcMain.handle(storeChannel, (_event, method: string, args) =>
  callStore(store, method, args)
);

const createWindow = (): void => {
  const window = new BrowserWindow({
    backgroundColor: "#FFFFFF",
    height: 1100,
    minHeight: 700,
    minWidth: 1100,
    show: false,
    title: "Productivity",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, "../preload/index.cjs"),
      sandbox: true,
    },
    width: 1920,
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  // Web and email links open in the browser or mail app, never inside the
  // app window. Other schemes, such as file:, are dropped.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (canOpenExternally(url)) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  // The window only ever shows the app. Another page loaded here would
  // keep the store bridge from the preload script.
  window.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  const devServer = process.env.ELECTRON_RENDERER_URL;

  if (isDev && devServer !== undefined) {
    void window.loadURL(devServer);
  } else {
    void window.loadFile(
      path.join(import.meta.dirname, "../renderer/index.html")
    );
  }
};

// An event, not a top-level await: an ES module main process would block
// its own startup waiting for "ready".
app.once("ready", createWindow);

app.on("activate", () => {
  if (app.isReady() && BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  store.close();
});
