import { openStore } from "@productivity/db";
import { createRemoteStore } from "@productivity/gtd";
import type { StoreTransport } from "@productivity/gtd";
import { render } from "@testing-library/react";

import { runStoreMethod } from "../src/main/store-handler.ts";
import { App } from "../src/renderer/src/app.tsx";
import type { View } from "../src/renderer/src/navigation.tsx";
import { Root, createQueryClient } from "../src/renderer/src/root.tsx";

/** Thursday 23 October 2026, 14:40: the day the design shows. */
export const fixedNow = new Date(2026, 9, 23, 14, 40);

/**
 * The whole app on a real in-memory database. Calls go through the same
 * handler as Electron's IPC, and are cloned like IPC clones them.
 */
export const renderApp = (initialView?: View) => {
  const store = openStore({
    clock: () => fixedNow,
    path: ":memory:",
    sample: true,
  });

  const transport: StoreTransport = async (method, args) =>
    structuredClone(await runStoreMethod(store, method, structuredClone(args)));

  render(
    <Root
      client={createQueryClient()}
      initialView={initialView}
      store={createRemoteStore(transport)}
    >
      <App />
    </Root>
  );

  return { store };
};
