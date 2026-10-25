import { syntaxTree } from "@codemirror/language";
import type { EditorState, Range, Text } from "@codemirror/state";
import { Decoration, ViewPlugin } from "@codemirror/view";
import type { DecorationSet, EditorView, ViewUpdate } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";

import { BulletWidget } from "./bullet-widget.ts";
import { CheckboxWidget } from "./checkbox-widget.ts";

/**
 * Obsidian-style live preview: Markdown shows formatted, and the lines being
 * edited show their raw syntax. The text itself never changes; this only
 * decorates it, so what the user typed is exactly what gets saved.
 */

const bullet = Decoration.replace({ widget: new BulletWidget() });
const hidden = Decoration.replace({});
const done = Decoration.mark({ class: "cm-md-done" });
const quoteLine = Decoration.line({ class: "cm-md-quote" });

const headingLine = (level: string) =>
  Decoration.line({ class: `cm-md-heading cm-md-h${level}` });

const isTicked = (doc: Text, marker: SyntaxNode): boolean =>
  /\[[xX]\]/u.test(doc.sliceString(marker.from, marker.to));

const lineNumbers = (doc: Text, from: number, to: number): number[] => {
  const first = doc.lineAt(from).number;

  return Array.from(
    { length: doc.lineAt(to).number - first + 1 },
    (_, index) => first + index
  );
};

/** The range of a marker plus the space after it, as in "# " or "> ". */
const withSpace = (doc: Text, node: SyntaxNode): Range<Decoration> =>
  hidden.range(
    node.from,
    doc.sliceString(node.to, node.to + 1) === " " ? node.to + 1 : node.to
  );

type Decorate = (doc: Text, node: SyntaxNode) => Range<Decoration>[];

/** Styles that hold whether or not a line is being edited. */
const styles = new Map<string, Decorate>([
  [
    "Blockquote",
    (doc, node) =>
      lineNumbers(doc, node.from, node.to).map((line) =>
        quoteLine.range(doc.line(line).from)
      ),
  ],
  [
    "Task",
    (doc, node) => {
      const marker = node.getChild("TaskMarker");

      if (marker === null || !isTicked(doc, marker)) {
        return [];
      }

      // Strike the words, not the space between the box and them.
      const gap = /^\s*/u.exec(doc.sliceString(marker.to, node.to))?.[0] ?? "";
      const from = marker.to + gap.length;

      return from < node.to ? [done.range(from, node.to)] : [];
    },
  ],
]);

const hide: Decorate = (_, node) => [hidden.range(node.from, node.to)];

/** Syntax drawn differently, or not at all, unless its line is being edited. */
const syntax = new Map<string, Decorate>([
  [
    "CodeMark",
    (doc, node) => (node.parent?.name === "InlineCode" ? hide(doc, node) : []),
  ],
  ["EmphasisMark", hide],
  [
    "HeaderMark",
    (doc, node) => {
      if (node.from === doc.lineAt(node.from).from) {
        return [withSpace(doc, node)];
      }

      // A closing "##" after the title hides with the space before it.
      const spaceBefore = doc.sliceString(node.from - 1, node.from) === " ";

      return [hidden.range(spaceBefore ? node.from - 1 : node.from, node.to)];
    },
  ],
  [
    "ListMark",
    (doc, node) => {
      const item = node.parent;

      if (item?.parent?.name !== "BulletList") {
        return [];
      }

      // A to-do shows only its checkbox; a plain item shows a bullet.
      return item.getChild("Task") === null
        ? [bullet.range(node.from, node.to)]
        : [withSpace(doc, node)];
    },
  ],
  ["QuoteMark", (doc, node) => [withSpace(doc, node)]],
  ["StrikethroughMark", hide],
  [
    "TaskMarker",
    (doc, node) => [
      Decoration.replace({
        widget: new CheckboxWidget(isTicked(doc, node)),
      }).range(node.from, node.to),
    ],
  ],
]);

/** Numbers of the lines that touch a selection or the cursor. */
const linesBeingEdited = (state: EditorState): Set<number> =>
  new Set(
    state.selection.ranges.flatMap((range) =>
      lineNumbers(state.doc, range.from, range.to)
    )
  );

/**
 * Decides how every piece of Markdown looks. Pure, so tests can call it on
 * an EditorState without a view. `editing` is false when the editor does not
 * have focus: then every line shows formatted, including the cursor's.
 */
export const previewDecorations = (
  state: EditorState,
  editing: boolean
): DecorationSet => {
  const { doc } = state;
  const raw = editing ? linesBeingEdited(state) : new Set<number>();
  const decorations: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter: ({ name, node, from }) => {
      const level = /^ATXHeading(?<level>[1-6])$/u.exec(name)?.groups?.level;

      if (level !== undefined) {
        decorations.push(headingLine(level).range(doc.lineAt(from).from));
      }

      decorations.push(...(styles.get(name)?.(doc, node) ?? []));

      if (!raw.has(doc.lineAt(from).number)) {
        decorations.push(...(syntax.get(name)?.(doc, node) ?? []));
      }
    },
  });

  return Decoration.set(decorations, true);
};

/**
 * Keeps the preview in step with edits, the cursor and focus. The whole
 * page is decorated on each change; journal pages are short enough that
 * this takes well under a millisecond.
 */
export const livePreview = ViewPlugin.define(
  (view: EditorView) => {
    const plugin = {
      decorations: previewDecorations(view.state, view.hasFocus),
      update: (update: ViewUpdate) => {
        if (
          update.docChanged ||
          update.selectionSet ||
          update.focusChanged ||
          syntaxTree(update.startState) !== syntaxTree(update.state)
        ) {
          plugin.decorations = previewDecorations(
            update.state,
            update.view.hasFocus
          );
        }
      },
    };

    return plugin;
  },
  { decorations: (plugin) => plugin.decorations }
);
