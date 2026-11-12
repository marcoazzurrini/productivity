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
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { inlineEdit, inlineEditField, setInlineEdit } from "./inline-edit.ts";
import type { InlineEditState } from "./inline-edit.ts";
import { InlinePrompt } from "./inline-prompt.tsx";
import type { PromptPosition } from "./inline-prompt.tsx";
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
  /**
   * Turns on ⌘K: select lines, say what to change, then accept or discard
   * the new text. Resolves with the new text for `from`–`to`.
   */
  onInlineEdit?: (request: InlineEditRequest) => Promise<string>;
  /** Called after the user accepts a ⌘K edit, with what they asked for. */
  onInlineEditAccepted?: (instruction: string) => void;
}

/** What a ⌘K edit asks for: new text for part of the document. */
export interface InlineEditRequest {
  markdown: string;
  from: number;
  to: number;
  instruction: string;
}

/**
 * How far the line numbers hang into the margin: the gutter's width in
 * theme.ts. Repeated here because StyleX only reads values from this file.
 */
const gutterWidth = 68;

const styles = stylex.create({
  // The numbers hang in the margin, so the text lines up with the page.
  numbered: {
    marginInlineStart: -gutterWidth,
    width: `calc(100% + ${gutterWidth}px)`,
  },
  root: { minHeight: 26, position: "relative", width: "100%" },
});

/** Where the ⌘K box sits: under the lines it edits, as wide as the text. */
const promptPosition = (
  view: EditorView,
  host: HTMLElement,
  edit: InlineEditState
): PromptPosition => {
  const box = host.getBoundingClientRect();
  const content = view.contentDOM.getBoundingClientRect();
  const end = view.coordsAtPos(edit.to) ?? view.coordsAtPos(edit.from);

  return {
    left: content.left - box.left,
    top: (end?.bottom ?? box.top) - box.top + 8,
    width: content.width || box.width,
  };
};

/** An error's words, without the wrapper Electron adds to IPC errors. */
const cleanMessage = (message: string): string =>
  message.replace(/^Error invoking remote method '[^']+': (?:\w+: )?/u, "");

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
  onInlineEdit,
  onInlineEditAccepted,
}: MarkdownEditorProps) => {
  const parent = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const [inline, setInline] = useState<InlineEditState | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [promptKey, setPromptKey] = useState(0);

  const [position, setPosition] = useState<PromptPosition>({
    left: 0,
    top: 0,
    width: 0,
  });

  /** What the user asked for so far in this ⌘K edit, follow-ups included. */
  const instructions = useRef<string[]>([]);
  /** Bumped to drop the answer of a request the user moved on from. */
  const request = useRef(0);
  const canEditInline = useEffectEvent(() => onInlineEdit !== undefined);

  const inlineChanged = useEffectEvent((edit: InlineEditState | null) => {
    if (edit !== null && inline === null) {
      setPromptKey((key) => key + 1);
    }

    setInline(edit);
  });

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
          inlineEdit(() => canEditInline()),
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

            const edit = update.state.field(inlineEditField);

            if (edit !== update.startState.field(inlineEditField)) {
              // After this update: showing the box moves focus, which
              // would start another update inside this one.
              queueMicrotask(() => {
                inlineChanged(edit);
              });
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
    editor.current = view;

    // Focus at the end, ready to carry on writing.
    if (autoFocus) {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      view.focus();
    }

    return () => {
      stopWatching();
      editor.current = null;
      view.destroy();
    };
  }, [autoFocus, hint, label, relativeLineNumbers, vim]);

  useLayoutEffect(() => {
    if (inline !== null && editor.current !== null && host.current !== null) {
      setPosition(promptPosition(editor.current, host.current, inline));
    }
  }, [inline]);

  const close = (view: EditorView): void => {
    request.current += 1;
    instructions.current = [];
    setInlineError(null);
    view.dispatch({ effects: setInlineEdit.of(null) });
    view.focus();
  };

  const submit = async (instruction: string): Promise<void> => {
    const view = editor.current;
    const edit = view?.state.field(inlineEditField);

    if (
      view === null ||
      edit === null ||
      edit === undefined ||
      onInlineEdit === undefined
    ) {
      return;
    }

    // A follow-up starts again from the original text, with every request.
    if (edit.phase === "previewing" && edit.original !== null) {
      view.dispatch({
        changes: { from: edit.from, insert: edit.original, to: edit.to },
      });
    }

    const { from } = edit;

    const to =
      edit.phase === "previewing" && edit.original !== null
        ? from + edit.original.length
        : edit.to;

    instructions.current = [...instructions.current, instruction];
    request.current += 1;

    const asked = request.current;

    setInlineError(null);
    view.dispatch({
      effects: setInlineEdit.of({ from, original: null, phase: "working", to }),
    });

    try {
      const answer = await onInlineEdit({
        from,
        instruction: instructions.current.join(". Then: "),
        markdown: view.state.doc.toString(),
        to,
      });

      const current = view.state.field(inlineEditField);

      if (
        asked !== request.current ||
        current === null ||
        current.phase !== "working"
      ) {
        return;
      }

      const original = view.state.sliceDoc(current.from, current.to);

      const replacement = original.endsWith("\n")
        ? answer
        : answer.replace(/\n+$/u, "");

      view.dispatch({
        changes: { from: current.from, insert: replacement, to: current.to },
        effects: setInlineEdit.of({
          from: current.from,
          original,
          phase: "previewing",
          to: current.from + replacement.length,
        }),
        userEvent: "input.inline-edit",
      });
    } catch (error) {
      const current = view.state.field(inlineEditField);

      if (asked !== request.current || current === null) {
        return;
      }

      instructions.current = instructions.current.slice(0, -1);
      setInlineError(
        cleanMessage(error instanceof Error ? error.message : String(error))
      );
      view.dispatch({
        effects: setInlineEdit.of({ ...current, phase: "prompt" }),
      });
    }
  };

  const accept = (): void => {
    const view = editor.current;

    if (view === null) {
      return;
    }

    const instruction = instructions.current.join(". Then: ");

    close(view);
    onInlineEditAccepted?.(instruction);
  };

  const discard = (): void => {
    const view = editor.current;
    const edit = view?.state.field(inlineEditField);

    if (view === null || edit === null || edit === undefined) {
      return;
    }

    if (edit.phase === "previewing" && edit.original !== null) {
      view.dispatch({
        changes: { from: edit.from, insert: edit.original, to: edit.to },
      });
    }

    close(view);
  };

  return (
    <div
      ref={host}
      {...stylex.props(styles.root, relativeLineNumbers && styles.numbered)}
    >
      <div ref={parent} />
      {inline === null ? null : (
        <InlinePrompt
          error={inlineError}
          key={promptKey}
          onAccept={accept}
          onDiscard={discard}
          onSubmit={(instruction) => {
            void submit(instruction);
          }}
          phase={inline.phase}
          position={position}
        />
      )}
    </div>
  );
};
