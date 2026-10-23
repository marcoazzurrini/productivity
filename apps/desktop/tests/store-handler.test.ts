import { openStore } from "@productivity/db";
import { describe, expect, it } from "vitest";

import {
  UnknownStoreMethodError,
  callStore,
} from "../src/main/store-handler.ts";

describe(callStore, () => {
  it("runs a store method with the given arguments", async () => {
    const store = openStore({ path: ":memory:" });

    const task = await callStore(store, "capture", [
      { title: "From the renderer" },
    ]);

    expect(task).toMatchObject({ list: "inbox", title: "From the renderer" });
    store.close();
  });

  it("refuses anything that is not a store method", () => {
    const store = openStore({ path: ":memory:" });

    expect(() => callStore(store, "close", [])).toThrow(
      UnknownStoreMethodError
    );
    expect(() => callStore(store, "__proto__", [])).toThrow(
      UnknownStoreMethodError
    );
    store.close();
  });
});
