import { mkdirSync } from "node:fs";
import path from "node:path";

import { createCalendar } from "@productivity/calendar";
import type { GoogleOptions } from "@productivity/calendar";
import { openStore } from "@productivity/db";
import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  safeStorage,
  shell,
} from "electron";

import { appearanceChannel } from "../shared/appearance.ts";
import { calendarChannel } from "../shared/calendar.ts";
import { storeChannel } from "../shared/channel.ts";
import { journalChannel } from "../shared/journal.ts";
import { checkTheme, readTheme, writeTheme } from "./appearance.ts";
import { callCalendar } from "./calendar-handler.ts";
import { canOpenExternally } from "./external-links.ts";
import { encryptedFile, listenForRedirect } from "./google.ts";
import { checkRead, checkWrite } from "./journal-handler.ts";
import { callStore } from "./store-handler.ts";

const isDev = !app.isPackaged;

/**
 * Where everything the app keeps lives: on macOS,
 * ~/Library/Application Support/Productivity for the installed app and
 * "Productivity Dev" beside it for development. So development never shares
 * a file with the installed app: not the database, the Google sign-in, the
 * Theme setting, nor the cookies and caches Electron keeps. Pinned by name,
 * so renaming the app never moves or loses the data, and outside the app
 * bundle, so reinstalling never touches it. PRODUCTIVITY_DATA_DIR lets
 * end-to-end tests use a throwaway folder.
 */
const dataDir =
  process.env.PRODUCTIVITY_DATA_DIR ??
  path.join(
    app.getPath("appData"),
    isDev ? "Productivity Dev" : "Productivity"
  );

// The database cannot open in a missing folder, as on a first run.
mkdirSync(dataDir, { recursive: true });

// Electron's own storage follows. It must be set before the app is ready.
app.setPath("userData", dataDir);

/**
 * PRODUCTIVITY_HIDDEN keeps the window and the Dock icon off screen, so
 * end-to-end tests run without popping the app up on the desktop.
 */
const isHidden = process.env.PRODUCTIVITY_HIDDEN === "1";

if (isHidden) {
  app.dock?.hide();
}

const store = openStore({
  path: path.join(dataDir, "productivity.sqlite"),
  // Development starts with sample data, so trying the app is quick.
  sample: isDev,
});

ipcMain.handle(storeChannel, (_event, method: string, args) =>
  callStore(store, method, args)
);

/**
 * The Google Cloud OAuth client ("Desktop app"), from .env.local at build
 * time or the environment at run time. Without one the calendar is local.
 */
const googleClientId =
  process.env.GOOGLE_CLIENT_ID ?? import.meta.env.MAIN_VITE_GOOGLE_CLIENT_ID;

const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET ??
  import.meta.env.MAIN_VITE_GOOGLE_CLIENT_SECRET;

const google: GoogleOptions | undefined =
  googleClientId === undefined || googleClientId === ""
    ? undefined
    : {
        client: { clientId: googleClientId, clientSecret: googleClientSecret },
        listenForRedirect,
        openBrowser: (url) => shell.openExternal(url),
        secrets: encryptedFile(path.join(dataDir, "google.token"), safeStorage),
      };

const calendar = createCalendar({
  google,
  repository: store.calendarRepository,
});

ipcMain.handle(calendarChannel.call, (_event, method: string, args) =>
  callCalendar(calendar, method, args)
);

calendar.subscribe(() => {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(calendarChannel.changed);
  }
});

/** Google has no push for desktop apps, so ask for changes regularly. */
const syncEveryMs = 2 * 60 * 1000;

setInterval(() => {
  void calendar.sync();
}, syncEveryMs);

app.on("browser-window-focus", () => {
  void calendar.sync();
});

ipcMain.handle(journalChannel.read, (_event, ...args) => {
  checkRead(args);

  return store.journal.read(...args);
});

ipcMain.handle(journalChannel.write, (_event, ...args) => {
  checkWrite(args);

  return store.journal.write(...args);
});

// The renderer is blocked until this replies, so it must always reply.
ipcMain.on(journalChannel.writeNow, (event, ...args) => {
  try {
    checkWrite(args);
    store.journal.write(...args);
    event.returnValue = true;
  } catch (error) {
    console.error("Could not save the journal page on close.", error);
    event.returnValue = false;
  }
});

/** The Theme setting. */
const themeFile = path.join(dataDir, "theme");

ipcMain.handle(appearanceChannel.getTheme, () => nativeTheme.themeSource);

// themeSource sets prefers-color-scheme in every window, which the design
// tokens follow, and the native chrome such as scrollbars and menus.
ipcMain.handle(appearanceChannel.setTheme, (_event, ...args) => {
  checkTheme(args);
  const [theme] = args;

  nativeTheme.themeSource = theme;
  writeTheme(themeFile, theme);
});

const createWindow = (): void => {
  const window = new BrowserWindow({
    // The page's background, so the window never flashes the other theme.
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#191919" : "#FFFFFF",
    height: 1100,
    minHeight: 700,
    minWidth: 1100,
    show: false,
    title: "Productivity",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      // A hidden window would otherwise slow its timers, such as the
      // journal's save after a pause.
      backgroundThrottling: !isHidden,
      contextIsolation: true,
      preload: path.join(import.meta.dirname, "../preload/index.cjs"),
      sandbox: true,
    },
    width: 1920,
  });

  window.once("ready-to-show", () => {
    if (!isHidden) {
      window.show();
    }
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
app.once("ready", () => {
  nativeTheme.themeSource = readTheme(themeFile);
  createWindow();
});

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
  calendar.close();
  store.close();
});
