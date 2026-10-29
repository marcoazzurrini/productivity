import type { Extension } from "@codemirror/state";
import { GutterMarker, gutter, gutters } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";

/**
 * What the gutter shows beside a line: the cursor's line shows its own
 * number, and every other line shows how far it is from the cursor, so a
 * count such as "5j" can be read straight off the gutter.
 */
export const relativeLabel = (line: number, cursorLine: number): string =>
  String(line === cursorLine ? line : Math.abs(line - cursorLine));

/** Headings sit lower in their line, so their numbers move down to match. */
const headingClass = (text: string): string => {
  const level = /^(?<hashes>#{1,3}) /u.exec(text)?.groups?.hashes?.length;

  return level === undefined ? "" : ` cm-md-gutter-h${level}`;
};

class LineNumber extends GutterMarker {
  readonly label: string;

  constructor(label: string, className: string) {
    super();
    this.label = label;
    this.elementClass = className;
  }

  override eq(other: LineNumber): boolean {
    return (
      other.label === this.label && other.elementClass === this.elementClass
    );
  }

  override toDOM(): Node {
    return document.createTextNode(this.label);
  }
}

/** Wide enough for the longest number the gutter can show. */
const spacerFor = (view: EditorView): LineNumber =>
  new LineNumber(String(view.state.doc.lines), "");

/** Vim-style relative line numbers, in a gutter left of the text. */
export const relativeLineNumbers: Extension = [
  // Pinned gutters stick to the nearest scrolling box. The editor never
  // scrolls, so that is the page, and a narrow page pushes them over the text.
  gutters({ fixed: false }),
  gutter({
    class: "cm-lineNumbers",
    initialSpacer: spacerFor,
    lineMarker(view, block) {
      const { doc, selection } = view.state;
      const line = doc.lineAt(block.from);
      const cursorLine = doc.lineAt(selection.main.head).number;
      const current = line.number === cursorLine ? "cm-md-current-line" : "";

      return new LineNumber(
        relativeLabel(line.number, cursorLine),
        current + headingClass(line.text)
      );
    },
    // Every number depends on where the cursor is.
    lineMarkerChange: (update) => update.selectionSet || update.docChanged,
    updateSpacer: (spacer, update) =>
      update.docChanged ? spacerFor(update.view) : spacer,
  }),
];
