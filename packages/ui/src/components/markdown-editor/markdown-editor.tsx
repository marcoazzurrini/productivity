import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useEffectEvent, useRef } from "react";

import { livePreview } from "./live-preview.ts";
import { markdownStyle, markdownTheme } from "./theme.ts";

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
}

const styles = stylex.create({
  root: { minHeight: 26, width: "100%" },
});

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
}: MarkdownEditorProps) => {
  const parent = useRef<HTMLDivElement>(null);
  // The editor is built once; these always call the latest handlers.
  const changed = useEffectEvent(onChange);
  const blurred = useEffectEvent(() => onBlur?.());

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

            if (update.focusChanged && !update.view.hasFocus) {
              blurred();
            }
          }),
        ],
      }),
    });

    // Focus at the end, ready to carry on writing.
    if (autoFocus) {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      view.focus();
    }

    return () => {
      view.destroy();
    };
  }, [autoFocus, hint, label]);

  return <div ref={parent} {...stylex.props(styles.root)} />;
};
