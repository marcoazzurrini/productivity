import { openStore } from "@productivity/db";
import type { Store } from "@productivity/db";
import { createRemoteStore } from "@productivity/gtd";
import type { StoreTransport } from "@productivity/gtd";
import { render } from "@testing-library/react";

import { checkRead, checkWrite } from "../src/main/journal-handler.ts";
import { runStoreMethod } from "../src/main/store-handler.ts";
import { App } from "../src/renderer/src/app.tsx";
import type { View } from "../src/renderer/src/navigation.tsx";
import { Root, createQueryClient } from "../src/renderer/src/root.tsx";
import type { JournalBridge } from "../src/shared/journal.ts";

/** Thursday 23 October 2026, 14:40: the day the design shows. */
export const fixedNow = new Date(2026, 9, 23, 14, 40);

/**
 * The whole app on a real in-memory database. Calls go through the same
 * handler as Electron's IPC, and are cloned like IPC clones them.
 */
export const renderApp = (
  initialView?: View,
  /** Runs against the store before the app first reads it. */
  prepare?: (store: Store) => void
) => {
  const store = openStore({
    clock: () => fixedNow,
    path: ":memory:",
    sample: true,
  });

  prepare?.(store);

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

  render(
    <Root
      client={createQueryClient()}
      initialView={initialView}
      journal={journal}
      store={createRemoteStore(transport)}
    >
      <App />
    </Root>
  );

  return { store };
};
