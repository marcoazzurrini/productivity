import { Prec, StateEffect, StateField } from "@codemirror/state";
import type { EditorState, Extension, Range } from "@codemirror/state";
import { Decoration, EditorView, keymap } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";

/**
 * A ⌘K edit in progress: the lines it covers, and how far along it is.
 * While `previewing`, the new text is already in the document and
 * `original` holds what it replaced, so Discard can put it back.
 */
export interface InlineEditState {
  from: number;
  to: number;
  phase: "prompt" | "working" | "previewing";
  original: string | null;
}

export const setInlineEdit = StateEffect.define<InlineEditState | null>({
  map: (value, changes) =>
    value === null
      ? null
      : {
          ...value,
          from: changes.mapPos(value.from, -1),
          to: changes.mapPos(value.to, 1),
        },
});

export const inlineEditField = StateField.define<InlineEditState | null>({
  create: () => null,
  update: (value, transaction) => {
    let next =
      value === null
        ? null
        : {
            ...value,
            from: transaction.changes.mapPos(value.from, -1),
            to: transaction.changes.mapPos(value.to, 1),
          };

    for (const effect of transaction.effects) {
      if (effect.is(setInlineEdit)) {
        next = effect.value;
      }
    }

    return next;
  },
});

const rangeLine = Decoration.line({ class: "cm-inline-edit-line" });
const previewLine = Decoration.line({ class: "cm-inline-edit-preview" });

/** Tints the lines a ⌘K edit covers: lighter while asking, blue when previewing. */
const inlineEditLines = EditorView.decorations.compute(
  [inlineEditField],
  (state): DecorationSet => {
    const edit = state.field(inlineEditField);

    if (edit === null) {
      return Decoration.none;
    }

    const first = state.doc.lineAt(edit.from).number;
    const last = state.doc.lineAt(Math.max(edit.from, edit.to)).number;
    const decoration = edit.phase === "previewing" ? previewLine : rangeLine;
    const lines: Range<Decoration>[] = [];

    for (let number = first; number <= last; number += 1) {
      lines.push(decoration.range(state.doc.line(number).from));
    }

    return Decoration.set(lines);
  }
);

/** A span of the document, as character offsets. */
export interface TextRange {
  from: number;
  to: number;
}

/**
 * The lines a ⌘K edit should cover: the selected lines, or with nothing
 * selected, the paragraph or list around the cursor.
 */
export const inlineEditRange = (state: EditorState): TextRange => {
  const { from, to, empty } = state.selection.main;
  const { doc } = state;

  if (!empty) {
    return { from: doc.lineAt(from).from, to: doc.lineAt(to).to };
  }

  let first = doc.lineAt(from).number;
  let last = first;

  while (first > 1 && doc.line(first - 1).text.trim() !== "") {
    first -= 1;
  }

  while (last < doc.lines && doc.line(last + 1).text.trim() !== "") {
    last += 1;
  }

  return { from: doc.line(first).from, to: doc.line(last).to };
};

/** ⌘K starts an edit, ahead of vim's keys. */
export const inlineEdit = (enabled: () => boolean): Extension => [
  inlineEditField,
  inlineEditLines,
  Prec.highest(
    keymap.of([
      {
        key: "Mod-k",
        run: (view) => {
          if (!enabled() || view.state.field(inlineEditField) !== null) {
            return false;
          }

          view.dispatch({
            effects: setInlineEdit.of({
              ...inlineEditRange(view.state),
              original: null,
              phase: "prompt",
            }),
          });

          return true;
        },
      },
    ])
  ),
];
