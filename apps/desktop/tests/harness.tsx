import { createCalendar } from "@productivity/calendar";
import type {
  CalendarService,
  CalendarTransport,
} from "@productivity/calendar";
import { openStore } from "@productivity/db";
import type { Store } from "@productivity/db";
import { createRemoteStore } from "@productivity/gtd";
import type { StoreTransport } from "@productivity/gtd";
import { render } from "@testing-library/react";

import { checkTheme } from "../src/main/appearance.ts";
import { runCalendarMethod } from "../src/main/calendar-handler.ts";
import { checkRead, checkWrite } from "../src/main/journal-handler.ts";
import { runStoreMethod } from "../src/main/store-handler.ts";
import { App } from "../src/renderer/src/app.tsx";
import type { View } from "../src/renderer/src/navigation.tsx";
import { Root, createQueryClient } from "../src/renderer/src/root.tsx";
import type { AppearanceBridge, Theme } from "../src/shared/appearance.ts";
import type { CalendarBridge } from "../src/shared/calendar.ts";
import type { JournalBridge } from "../src/shared/journal.ts";

/** What main/index.ts would keep in its theme file. */
export interface SavedAppearance {
  theme: Theme;
}

/** Thursday 23 October 2026, 14:40: the day the design shows. */
export const fixedNow = new Date(2026, 9, 23, 14, 40);

/**
 * The whole app on a real in-memory database. Calls go through the same
 * handler as Electron's IPC, and are cloned like IPC clones them.
 */
export const renderApp = (
  initialView?: View,
  /** Runs against the store and calendar before the app first reads them. */
  prepare?: (store: Store, calendar: CalendarService) => void
) => {
  const store = openStore({
    clock: () => fixedNow,
    path: ":memory:",
    sample: true,
  });

  const calendar = createCalendar({
    clock: () => fixedNow,
    repository: store.calendarRepository,
    syncDelayMs: null,
  });

  prepare?.(store, calendar);

  const transport: StoreTransport = async (method, args) =>
    structuredClone(await runStoreMethod(store, method, structuredClone(args)));

  // The same checks and store calls as the IPC handlers in main/index.ts.
  const journal: JournalBridge = {
    read: (...args) =>
      Promise.resolve(structuredClone(args)).then((cloned) => {
        checkRead(cloned);

        return structuredClone(store.journal.read(...cloned));
      }),
    write: (...args) =>
      Promise.resolve(structuredClone(args)).then((cloned) => {
        checkWrite(cloned);

        return structuredClone(store.journal.write(...cloned));
      }),
    writeNow: (...args) => {
      checkWrite(args);
      store.journal.write(...args);
    },
  };

  // The same handler as the calendar's IPC channel in main/index.ts.
  const call: CalendarTransport = (method, args) =>
    runCalendarMethod(calendar, method, structuredClone(args)).then((result) =>
      structuredClone(result)
    );

  const calendarBridge: CalendarBridge = {
    call,
    onChanged: (listener) => calendar.subscribe(listener),
  };

  // The theme main/index.ts would save; prefers-color-scheme is not emulated.
  const appearance: SavedAppearance = { theme: "system" };

  const appearanceBridge: AppearanceBridge = {
    getTheme: () => Promise.resolve(appearance.theme),
    setTheme: (...args) => {
      const cloned = structuredClone(args);

      checkTheme(cloned);
      [appearance.theme] = cloned;

      return Promise.resolve();
    },
  };

  render(
    <Root
      appearance={appearanceBridge}
      calendar={calendarBridge}
      client={createQueryClient()}
      initialView={initialView}
      journal={journal}
      store={createRemoteStore(transport)}
    >
      <App />
    </Root>
  );

  return { appearance, calendar, store };
};
