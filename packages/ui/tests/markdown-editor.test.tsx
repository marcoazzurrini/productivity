import { describe, expect, mock, test } from "bun:test";

import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { ensureSyntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { previewDecorations } from "../src/components/markdown-editor/live-preview.ts";
import { relativeLabel } from "../src/components/markdown-editor/relative-line-numbers.ts";
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

/** Presses one key in the editor, as vim reads it. */
const press = (view: EditorView, key: string): void => {
  view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key })
  );
};

describe("relative line numbers", () => {
  test("show the cursor's line, and how far every other line is", () => {
    expect([1, 2, 3, 4, 5].map((line) => relativeLabel(line, 3))).toEqual([
      "2",
      "1",
      "3",
      "1",
      "2",
    ]);
  });

  test("follow the cursor in the gutter", () => {
    render(
      <MarkdownEditor
        initialValue={"One\nTwo\nThree\nFour"}
        label="Journal"
        onChange={mock()}
        relativeLineNumbers
      />
    );

    const view = editorOf();

    // The numbers shown, without the hidden spacer that sizes the gutter.
    const numbers = () =>
      [
        ...view.dom.querySelectorAll<HTMLElement>(
          ".cm-lineNumbers .cm-gutterElement"
        ),
      ].flatMap((element) =>
        element.style.visibility === "hidden" ? [] : [element.textContent]
      );

    expect(numbers()).toEqual(["1", "1", "2", "3"]);

    view.dispatch({ selection: { anchor: "One\nTwo\nTh".length } });

    expect(numbers()).toEqual(["2", "1", "3", "1"]);
  });
});

describe("vim keys", () => {
  test("start in normal mode, where keys are commands", () => {
    const onChange = mock();
    const onVimModeChange = mock();

    render(
      <MarkdownEditor
        initialValue={"Keep\nDelete me\nKeep too"}
        label="Journal"
        onChange={onChange}
        onVimModeChange={onVimModeChange}
        vim
      />
    );

    const view = editorOf();

    expect(onVimModeChange).toHaveBeenLastCalledWith("normal");

    view.dispatch({ selection: { anchor: "Keep\n".length } });
    press(view, "d");
    press(view, "d");

    expect(onChange).toHaveBeenLastCalledWith("Keep\nKeep too");
  });

  test("report each change of mode", () => {
    const onVimModeChange = mock();

    render(
      <MarkdownEditor
        initialValue="Hello"
        label="Journal"
        onChange={mock()}
        onVimModeChange={onVimModeChange}
        vim
      />
    );

    const view = editorOf();

    press(view, "i");
    expect(onVimModeChange).toHaveBeenLastCalledWith("insert");

    press(view, "Escape");
    press(view, "V");
    expect(onVimModeChange).toHaveBeenLastCalledWith("visual line");
  });

  test("save with :w", () => {
    const onSave = mock();

    render(
      <MarkdownEditor
        initialValue="Hello"
        label="Journal"
        onChange={mock()}
        onSave={onSave}
        vim
      />
    );

    const view = editorOf();

    press(view, ":");

    const prompt = view.dom.querySelector("input");

    if (prompt === null) {
      throw new Error('":" opened no prompt.');
    }

    prompt.value = "w";
    // The prompt reads Enter by its old key code.
    prompt.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "Enter", keyCode: 13 })
    );

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test("report where the cursor is", () => {
    const onCursorMove = mock();

    render(
      <MarkdownEditor
        initialValue={"One\nTwo"}
        label="Journal"
        onChange={mock()}
        onCursorMove={onCursorMove}
        vim
      />
    );

    editorOf().dispatch({ selection: { anchor: "One\nTw".length } });

    expect(onCursorMove).toHaveBeenLastCalledWith({ column: 3, line: 2 });
  });
});
