import type { RemoteGtdStore } from "@productivity/gtd";
import { createContext, use } from "react";
import type { ReactNode } from "react";

const StoreContext = createContext<RemoteGtdStore | null>(null);

/** Provides the store client. Tests pass one backed by an in-memory database. */
export const StoreProvider = ({
  store,
  children,
}: {
  store: RemoteGtdStore;
  children: ReactNode;
}) => <StoreContext value={store}>{children}</StoreContext>;

export const useStore = (): RemoteGtdStore => {
  const store = use(StoreContext);

  if (store === null) {
    throw new Error("useStore needs a StoreProvider above it.");
  }

  return store;
};
