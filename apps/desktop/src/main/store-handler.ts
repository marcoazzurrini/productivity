import { isGtdStoreMethod } from "@productivity/gtd";
import type { GtdStore, GtdStoreMethod } from "@productivity/gtd";

export class UnknownStoreMethodError extends Error {
  constructor(method: string) {
    super(`"${method}" is not a store method.`);
    this.name = "UnknownStoreMethodError";
  }
}

/**
 * Runs one store method. The generic signature keeps each method's argument
 * and result types tied together for typed callers such as tests.
 */
export const runStoreMethod = <Method extends GtdStoreMethod>(
  store: GtdStore,
  method: Method,
  args: Parameters<GtdStore[Method]>
): ReturnType<GtdStore[Method]> => {
  // SAFETY: indexing GtdStore with a single method name yields that method;
  // TypeScript cannot correlate the generic key with its parameter list.
  const run = store[method] as (
    ...input: Parameters<GtdStore[Method]>
  ) => ReturnType<GtdStore[Method]>;

  return run(...args);
};

/** The arguments of any store method, as they arrive over IPC. */
type StoreArgs = Parameters<GtdStore[GtdStoreMethod]>;

/**
 * Runs one call from the renderer against the store. Only methods of the
 * GtdStore interface are allowed; anything else is refused.
 */
export const callStore = (store: GtdStore, method: string, args: StoreArgs) => {
  if (!isGtdStoreMethod(method)) {
    throw new UnknownStoreMethodError(method);
  }

  // SAFETY: the renderer builds `args` with createRemoteStore, whose types
  // match the parameters of the method it names.
  return runStoreMethod(
    store,
    method,
    args as Parameters<GtdStore[typeof method]>
  );
};
