import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { InvalidDayError, openStore } from "../src/index.ts";
import type { Store } from "../src/index.ts";
import { fixedNow, memoryStore } from "./helpers.ts";

let store: Store;

afterEach(() => {
  store.close();
});

describe("the journal", () => {
  test("reads a day with nothing written as an empty page", () => {
    store = memoryStore();

    expect(store.journal.read("2026-10-23")).toEqual({
      day: "2026-10-23",
      markdown: "",
      updatedAt: null,
    });
  });

  test("keeps exactly what was written, stamped with the time", () => {
    store = memoryStore();
    const markdown = "## Morning\n\n- [ ] Call Diane  \n**clear**\n";

    expect(store.journal.write("2026-10-23", markdown)).toEqual({
      day: "2026-10-23",
      markdown,
      updatedAt: "2026-10-23T14:40",
    });
    expect(store.journal.read("2026-10-23").markdown).toBe(markdown);
  });

  test("replaces a day's page and leaves other days alone", () => {
    store = memoryStore();

    store.journal.write("2026-10-22", "Yesterday");
    store.journal.write("2026-10-23", "First draft");
    store.journal.write("2026-10-23", "Second draft");

    expect(store.journal.read("2026-10-23").markdown).toBe("Second draft");
    expect(store.journal.read("2026-10-22").markdown).toBe("Yesterday");
  });

  test("removes a page when only whitespace is left", () => {
    store = memoryStore();

    store.journal.write("2026-10-23", "Something");

    expect(store.journal.write("2026-10-23", " \n\t ")).toEqual({
      day: "2026-10-23",
      markdown: "",
      updatedAt: null,
    });
    expect(store.journal.read("2026-10-23").updatedAt).toBeNull();
  });

  test.each(["2026-02-30", "2026-1-5", "yesterday", "", "2026-10-23T09:00"])(
    "refuses %p, which is not a real day",
    (day) => {
      store = memoryStore();

      expect(() => store.journal.read(day)).toThrow(InvalidDayError);
      expect(() => store.journal.write(day, "x")).toThrow(InvalidDayError);
    }
  );

  test("survives closing and reopening the database", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "productivity-"));
    const file = path.join(directory, "gtd.sqlite");

    const first = openStore({ clock: () => fixedNow, path: file });

    first.journal.write("2026-10-23", "Written before quitting");
    first.close();

    store = openStore({ clock: () => fixedNow, path: file });

    expect(store.journal.read("2026-10-23").markdown).toBe(
      "Written before quitting"
    );

    rmSync(directory, { force: true, recursive: true });
  });
});
