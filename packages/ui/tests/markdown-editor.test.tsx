import { describe, expect, mock, test } from "bun:test";

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { ensureSyntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { previewDecorations } from "../src/components/markdown-editor/live-preview.ts";
import { MarkdownEditor } from "../src/index.ts";

/** A fully parsed editor state with the cursor at `cursor`. */
const stateOf = (doc: string, cursor = 0): EditorState => {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
    selection: EditorSelection.cursor(cursor),
  });

  ensureSyntaxTree(state, doc.length, 5000);

  return state;
};

/**
 * What the reader sees: the text without hidden ranges, with widgets
 * written as <WidgetName>. Line and text styles do not change the text.
 */
const visibleText = (state: EditorState, editing: boolean): string => {
  const doc = state.doc.toString();
  let shown = "";
  let at = 0;

  previewDecorations(state, editing).between(
    0,
    doc.length,
    (from, to, value) => {
      if (from === to || value.spec.class !== undefined) {
        return;
      }

      shown += doc.slice(at, from);
      shown +=
        value.spec.widget === undefined
          ? ""
          : `<${value.spec.widget.constructor.name}>`;
      at = to;
    }
  );

  return shown + doc.slice(at);
};

const lineClasses = (state: EditorState): string[] => {
  const classes: string[] = [];

  previewDecorations(state, false).between(
    0,
    state.doc.length,
    (from, to, value) => {
      if (from === to && value.spec.class !== undefined) {
        classes.push(
          `${state.doc.lineAt(from).number}:${String(value.spec.class)}`
        );
      }
    }
  );

  return classes;
};

describe("live preview", () => {
  test("hides Markdown syntax on lines that are not being edited", () => {
    const doc =
      "## Morning\n\nSlept **well** and _early_, with `code`.\n> A quote";

    expect(visibleText(stateOf(doc), false)).toBe(
      "Morning\n\nSlept well and early, with code.\nA quote"
    );
  });

  test("shows the raw syntax on the line with the cursor", () => {
    const doc = "## Morning\nSlept **well**";
    const onSecondLine = stateOf(doc, doc.length);

    expect(visibleText(onSecondLine, true)).toBe("Morning\nSlept **well**");
    expect(visibleText(stateOf(doc, 2), true)).toBe("## Morning\nSlept well");
  });

  test("shows everything formatted when the editor is not focused", () => {
    const doc = "Slept **well**";

    expect(visibleText(stateOf(doc, doc.length), false)).toBe("Slept well");
  });

  test("draws bullets and checkboxes for lists", () => {
    const doc =
      "- Shipped it\n- [ ] Book flights\n- [x] Send draft\n1. Numbered";

    expect(visibleText(stateOf(doc), false)).toBe(
      "<BulletWidget> Shipped it\n<CheckboxWidget> Book flights\n<CheckboxWidget> Send draft\n1. Numbered"
    );
  });

  test("styles headings and quotes by line, and strikes done to-dos", () => {
    const doc = "# Big\n### Small\n> One\n> Two\n- [x] Done";

    expect(lineClasses(stateOf(doc))).toEqual([
      "1:cm-md-heading cm-md-h1",
      "2:cm-md-heading cm-md-h3",
      "3:cm-md-quote",
      "4:cm-md-quote",
    ]);

    const struck: string[] = [];

    previewDecorations(stateOf(doc), false).between(
      0,
      doc.length,
      (from, to, value) => {
        if (value.spec.class === "cm-md-done") {
          struck.push(doc.slice(from, to));
        }
      }
    );

    expect(struck).toEqual(["Done"]);
  });

  test("keeps code fences as they are", () => {
    const doc = "```\n**not bold**\n```";

    expect(visibleText(stateOf(doc), false)).toBe(doc);
  });
});

/** The CodeMirror view behind the "Journal" text box. */
const editorOf = (): EditorView => {
  const content = screen.getByRole("textbox", { name: "Journal" });
  const view = EditorView.findFromDOM(content);

  if (view === null) {
    throw new Error("The text box is not a CodeMirror editor.");
  }

  return view;
};

describe("MarkdownEditor", () => {
  test("starts with the given text and reports every edit", () => {
    const onChange = mock();

    render(
      <MarkdownEditor
        initialValue="Hello"
        label="Journal"
        onChange={onChange}
      />
    );

    const view = editorOf();

    view.dispatch({ changes: { from: 5, insert: " world" } });

    expect(onChange).toHaveBeenLastCalledWith("Hello world");
  });

  test("ignores a new initial value, so typing is never overwritten", () => {
    const { rerender } = render(
      <MarkdownEditor initialValue="First" label="Journal" onChange={mock()} />
    );

    rerender(
      <MarkdownEditor initialValue="Second" label="Journal" onChange={mock()} />
    );

    expect(editorOf().state.doc.toString()).toBe("First");
  });

  test("ticks a to-do by clicking its checkbox", async () => {
    const onChange = mock();

    render(
      <MarkdownEditor
        initialValue={"- [ ] Book flights\n- [x] Send draft"}
        label="Journal"
        onChange={onChange}
      />
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "To do" }));

    expect(onChange).toHaveBeenLastCalledWith(
      "- [x] Book flights\n- [x] Send draft"
    );
  });

  test("continues a list on Enter", () => {
    const onChange = mock();

    render(
      <MarkdownEditor
        initialValue="- Milk"
        label="Journal"
        onChange={onChange}
      />
    );

    const view = editorOf();

    view.dispatch({ selection: { anchor: 6 } });
    view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
      })
    );

    expect(onChange).toHaveBeenLastCalledWith("- Milk\n- ");
  });
});
