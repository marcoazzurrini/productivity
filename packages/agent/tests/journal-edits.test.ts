import { describe, expect, test } from "bun:test";

import { applyLineEdits, InvalidEditError, numberLines } from "../src/index.ts";

const page = "# Day\nOne\nTwo\nThree";

describe("journal line edits", () => {
  test("numbers lines from 1", () => {
    expect(numberLines("A\nB")).toBe("1| A\n2| B");
  });

  test("replaces a range of lines", () => {
    expect(
      applyLineEdits(page, [{ fromLine: 2, replacement: "1\n2", toLine: 3 }])
    ).toEqual({
      changes: [{ added: ["1", "2"], line: 2, removed: ["One", "Two"] }],
      markdown: "# Day\n1\n2\nThree",
    });
  });

  test("applies several edits against the original numbering", () => {
    expect(
      applyLineEdits(page, [
        { fromLine: 4, replacement: "3", toLine: 4 },
        { fromLine: 2, replacement: "1\n1b", toLine: 2 },
      ]).markdown
    ).toBe("# Day\n1\n1b\nTwo\n3");
  });

  test("inserts before a line and deletes lines", () => {
    expect(
      applyLineEdits(page, [
        { fromLine: 2, replacement: "Zero", toLine: 1 },
        { fromLine: 3, replacement: "", toLine: 3 },
      ]).markdown
    ).toBe("# Day\nZero\nOne\nThree");
  });

  test("refuses lines that are not on the page, and overlaps", () => {
    expect(() =>
      applyLineEdits(page, [{ fromLine: 5, replacement: "x", toLine: 6 }])
    ).toThrow(InvalidEditError);
    expect(() =>
      applyLineEdits(page, [
        { fromLine: 1, replacement: "x", toLine: 2 },
        { fromLine: 2, replacement: "y", toLine: 3 },
      ])
    ).toThrow("overlap");
  });
});
