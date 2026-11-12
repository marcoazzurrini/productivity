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

  it("runs the heading methods, which the renderer's project page calls", async () => {
    const store = openStore({ path: ":memory:" });

    const project = store.createProject({
      areaId: null,
      deadline: null,
      name: "Talk",
      outcome: "",
    });

    const heading = await callStore(store, "createHeading", [
      project.id,
      "Slides",
    ]);

    expect(heading).toMatchObject({ projectId: project.id, title: "Slides" });
    expect(store.getProject(project.id)?.headings).toStrictEqual([heading]);
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
