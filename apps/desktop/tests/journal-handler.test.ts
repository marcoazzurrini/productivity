import { describe, expect, it } from "vitest";

import {
  InvalidJournalCallError,
  checkRead,
  checkWrite,
} from "../src/main/journal-handler.ts";

describe("journal calls over IPC", () => {
  it("accepts a day, and a day with text", () => {
    expect(() => {
      checkRead(["2026-10-23"]);
    }).not.toThrow();
    expect(() => {
      checkWrite(["2026-10-23", "## Morning"]);
    }).not.toThrow();
  });

  it.each([
    [[]],
    [[20_261_023]],
    [["2026-10-23", "extra"]],
    [[{ toString: () => "2026-10-23" }]],
  ])("refuses a read of %j", (args) => {
    expect(() => {
      checkRead(args);
    }).toThrow(InvalidJournalCallError);
  });

  it.each([
    [["2026-10-23"]],
    [["2026-10-23", null]],
    [["2026-10-23", ["## Morning"]]],
    [[null, "text"]],
  ])("refuses a write of %j", (args) => {
    expect(() => {
      checkWrite(args);
    }).toThrow(InvalidJournalCallError);
  });
});
