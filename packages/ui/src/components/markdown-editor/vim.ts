import { Facet } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { Vim, getCM, vim as vimKeys } from "@replit/codemirror-vim";

/** The vim mode the editor is in, as its mode line names it. */
export type VimMode =
  | "normal"
  | "insert"
  | "replace"
  | "visual"
  | "visual line"
  | "visual block";

/** What ":w" runs in an editor. */
const saveCommand = Facet.define<() => void, (() => void) | null>({
  combine: (handlers) => handlers.at(-1) ?? null,
});

// Ex commands are shared by every editor, so ":w" looks up the handler of
// the editor it was typed in.
Vim.defineEx("write", "w", (cm) => {
  const view: EditorView = cm.cm6;

  view.state.facet(saveCommand)?.();
});

/**
 * Vim keys, starting in normal mode. They come before the editor's other
 * keymaps, so in insert mode the rest (like list continuation) still work.
 */
export const vimMode = (onSave: () => void): Extension => [
  vimKeys(),
  saveCommand.of(onSave),
];

const modeOf = (mode: string, subMode?: string): VimMode => {
  if (mode === "visual" && subMode === "linewise") {
    return "visual line";
  }

  if (mode === "visual" && subMode === "blockwise") {
    return "visual block";
  }

  return mode === "insert" || mode === "replace" || mode === "visual"
    ? mode
    : "normal";
};

/** Calls `onChange` with each new mode. Returns a function that stops it. */
export const watchVimMode = (
  view: EditorView,
  onChange: (mode: VimMode) => void
): (() => void) => {
  const cm = getCM(view);

  const changed = (event: { mode: string; subMode?: string }) => {
    onChange(modeOf(event.mode, event.subMode));
  };

  cm?.on("vim-mode-change", changed);

  return () => {
    cm?.off("vim-mode-change", changed);
  };
};
