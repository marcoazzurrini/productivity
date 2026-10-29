import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  keymap,
  placeholder,
} from "@codemirror/view";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useEffectEvent, useRef } from "react";

import { livePreview } from "./live-preview.ts";
import { relativeLineNumbers as lineNumberGutter } from "./relative-line-numbers.ts";
import { markdownStyle, markdownTheme } from "./theme.ts";
import { vimMode, watchVimMode } from "./vim.ts";
import type { VimMode } from "./vim.ts";

/** Where the cursor is, counting lines and columns from 1. */
export interface CursorPosition {
  line: number;
  column: number;
}

export interface MarkdownEditorProps {
  /** Names the text area for screen readers. */
  label: string;
  /**
   * The text the editor starts with. The editor owns its text after that,
   * so later values are ignored: give it a new `key` to load other text.
   */
  initialValue: string;
  /** Called with the whole text after every edit. */
  onChange: (markdown: string) => void;
  /** Called when the editor loses focus. */
  onBlur?: () => void;
  placeholder?: string;
  /** Focus the editor with the cursor after the last character. */
  autoFocus?: boolean;
  /** Edit with vim keys, starting in normal mode. */
  vim?: boolean;
  /** Show vim-style relative line numbers, hanging left of the text. */
  relativeLineNumbers?: boolean;
  /** Called when the user asks to save now, with ":w" in vim. */
  onSave?: () => void;
  /** Called with the vim mode each time it changes. */
  onVimModeChange?: (mode: VimMode) => void;
  /** Called with the cursor's position each time it moves. */
  onCursorMove?: (cursor: CursorPosition) => void;
}

const styles = stylex.create({
  // The numbers hang in the margin, so the text lines up with the page.
  numbered: { marginInlineStart: -30, width: "calc(100% + 30px)" },
  root: { minHeight: 26, width: "100%" },
});

const cursorOf = (view: EditorView): CursorPosition => {
  const { head } = view.state.selection.main;
  const line = view.state.doc.lineAt(head);

  return { column: head - line.from + 1, line: line.number };
};

/**
 * A Markdown editor with live preview: text shows formatted, and the line
 * being edited shows its raw syntax. Lists continue on Enter, and to-dos
 * tick with a click.
 */
export const MarkdownEditor = ({
  label,
  initialValue,
  onChange,
  onBlur,
  placeholder: hint,
  autoFocus = false,
  vim = false,
  relativeLineNumbers = false,
  onSave,
  onVimModeChange,
  onCursorMove,
}: MarkdownEditorProps) => {
  const parent = useRef<HTMLDivElement>(null);
  // The editor is built once; these always call the latest handlers.
  const changed = useEffectEvent(onChange);
  const blurred = useEffectEvent(() => onBlur?.());
  const saved = useEffectEvent(() => onSave?.());

  const modeChanged = useEffectEvent((mode: VimMode) =>
    onVimModeChange?.(mode)
  );

  const cursorMoved = useEffectEvent((cursor: CursorPosition) =>
    onCursorMove?.(cursor)
  );

  // The latest text, so rebuilding the editor (say, for a new label) keeps it.
  const text = useRef(initialValue);

  useEffect(() => {
    if (parent.current === null) {
      return;
    }

    const view = new EditorView({
      parent: parent.current,
      state: EditorState.create({
        doc: text.current,
        extensions: [
          // Vim's keys go first, so they win over the keymaps below.
          vim ? [vimMode(() => saved()), drawSelection()] : [],
          relativeLineNumbers ? lineNumberGutter : [],
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown({ base: markdownLanguage }),
          syntaxHighlighting(markdownStyle),
          livePreview,
          markdownTheme,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": label }),
          placeholder(hint ?? ""),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              text.current = update.state.doc.toString();
              changed(text.current);
            }

            if (update.selectionSet || update.docChanged) {
              cursorMoved(cursorOf(update.view));
            }

            if (update.focusChanged && !update.view.hasFocus) {
              blurred();
            }
          }),
        ],
      }),
    });

    const stopWatching = watchVimMode(view, (mode) => {
      modeChanged(mode);
    });

    // A new editor starts in normal mode and reports no change for it.
    if (vim) {
      modeChanged("normal");
    }

    cursorMoved(cursorOf(view));

    // Focus at the end, ready to carry on writing.
    if (autoFocus) {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      view.focus();
    }

    return () => {
      stopWatching();
      view.destroy();
    };
  }, [autoFocus, hint, label, relativeLineNumbers, vim]);

  return (
    <div
      ref={parent}
      {...stylex.props(styles.root, relativeLineNumbers && styles.numbered)}
    />
  );
};
