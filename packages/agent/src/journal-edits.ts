import type { LineChange } from "./model.ts";

/** One edit: replace lines `fromLine` to `toLine` (from 1, inclusive). */
export interface LineEdit {
  fromLine: number;
  toLine: number;
  /** The new text for those lines. Empty deletes them. */
  replacement: string;
}

export class InvalidEditError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEditError";
  }
}

/** The page with each line numbered, as the model reads it. */
export const numberLines = (markdown: string): string =>
  markdown
    .split("\n")
    .map((line, index) => `${index + 1}| ${line}`)
    .join("\n");

/**
 * Applies line edits to a page. To insert without replacing, an edit may
 * use `fromLine = toLine + 1`. Edits must not overlap.
 */
/** A page after edits, and what changed, for showing the edit. */
export interface EditedPage {
  markdown: string;
  changes: LineChange[];
}

export const applyLineEdits = (
  markdown: string,
  edits: readonly LineEdit[]
): EditedPage => {
  const lines = markdown.split("\n");

  const sorted = edits.toSorted(
    (left, right) => left.fromLine - right.fromLine
  );

  let previousEnd = 0;

  for (const edit of sorted) {
    const { fromLine, toLine } = edit;

    if (
      !Number.isInteger(fromLine) ||
      !Number.isInteger(toLine) ||
      fromLine < 1 ||
      toLine < fromLine - 1 ||
      toLine > lines.length ||
      fromLine > lines.length + 1
    ) {
      throw new InvalidEditError(
        `Lines ${fromLine}–${toLine} are not on the page, which has ${lines.length} lines.`
      );
    }

    if (fromLine <= previousEnd) {
      throw new InvalidEditError("Edits must not overlap.");
    }

    previousEnd = Math.max(previousEnd, toLine);
  }

  const changes: LineChange[] = sorted.map((edit) => ({
    added: edit.replacement === "" ? [] : edit.replacement.split("\n"),
    line: edit.fromLine,
    removed: lines.slice(edit.fromLine - 1, edit.toLine),
  }));

  // From the bottom up, so earlier line numbers stay valid.
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const edit = sorted[index];
    const change = changes[index];

    if (edit !== undefined && change !== undefined) {
      lines.splice(
        edit.fromLine - 1,
        edit.toLine - edit.fromLine + 1,
        ...change.added
      );
    }
  }

  return { changes, markdown: lines.join("\n") };
};
