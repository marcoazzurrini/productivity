import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

import { color, font, radius } from "../../tokens.stylex.ts";

/** Text styles for Markdown. They apply on raw lines too. */
export const markdownStyle = HighlightStyle.define([
  { fontWeight: font.weightBold, tag: tags.strong },
  { fontStyle: "italic", tag: tags.emphasis },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { color: color.textLink, tag: [tags.link, tags.url] },
  {
    backgroundColor: color.bgHover,
    borderRadius: radius.xs,
    fontFamily: font.mono,
    fontSize: "0.9em",
    padding: "1px 3px",
    tag: tags.monospace,
  },
  // Raw syntax, such as "**" and "- ", recedes behind the words.
  { color: color.textTertiary, tag: [tags.processingInstruction, tags.atom] },
]);

/** The editor's look, from the design system's tokens. */
export const markdownTheme = EditorView.theme({
  "&": { color: color.textPrimary },
  "&.cm-focused": { outline: "none" },
  // Visual mode's selection, drawn by the editor rather than the browser.
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: color.accentSubtleHover,
  },
  // Away from the editor, the block cursor is only an outline.
  "&:not(.cm-focused) .cm-vimCursorLayer .cm-fat-cursor": {
    backgroundColor: "transparent",
    outlineColor: color.accent,
  },
  ".cm-content": {
    caretColor: color.accent,
    fontFamily: font.family,
    fontSize: "16px",
    lineHeight: "26px",
    padding: 0,
  },
  // As thin as the browser's own caret, which vim mode replaces.
  ".cm-cursor": { borderLeftColor: color.accent, borderLeftWidth: "1px" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: color.textPlaceholder,
    fontFamily: font.mono,
    fontSize: "11px",
  },
  ".cm-line": { padding: 0 },
  ".cm-lineNumbers .cm-gutterElement": {
    fontVariantNumeric: "tabular-nums",
    lineHeight: "26px",
    minWidth: "20px",
    // Faint, and far from the text, so the numbers stay out of the way.
    opacity: 0.6,
    padding: "0 40px 0 0",
    textAlign: "right",
  },
  // The cursor's line stands out a little, without colour that draws the eye.
  ".cm-lineNumbers .cm-gutterElement.cm-md-current-line": {
    color: color.textTertiary,
    fontWeight: font.weightMedium,
    opacity: 1,
  },
  // A heading's number lines up with the heading, which sits lower.
  ".cm-lineNumbers .cm-gutterElement.cm-md-gutter-h1": { paddingTop: "13px" },
  ".cm-lineNumbers .cm-gutterElement.cm-md-gutter-h2": { paddingTop: "11px" },
  ".cm-lineNumbers .cm-gutterElement.cm-md-gutter-h3": { paddingTop: "9px" },
  ".cm-md-bullet": {
    backgroundColor: color.textSecondary,
    borderRadius: "50%",
    display: "inline-block",
    height: "6px",
    marginInline: "3px 1px",
    verticalAlign: "middle",
    width: "6px",
  },
  ".cm-md-checkbox": {
    accentColor: color.accent,
    cursor: "pointer",
    height: "16px",
    margin: "0 2px 0 0",
    verticalAlign: "-2px",
    width: "16px",
  },
  ".cm-md-done": {
    color: color.textTertiary,
    textDecoration: "line-through",
  },
  ".cm-md-h1": { fontSize: "26px", lineHeight: "36px" },
  ".cm-md-h2": { fontSize: "20px", lineHeight: "32px" },
  ".cm-md-h3": { fontSize: "17px", lineHeight: "28px" },
  ".cm-md-heading": {
    fontWeight: font.weightSemibold,
    letterSpacing: "-0.01em",
    paddingTop: "8px !important",
  },
  ".cm-md-quote": {
    borderLeft: `3px solid ${color.borderStrong}`,
    color: color.textSecondary,
    fontStyle: "italic",
    paddingLeft: "16px !important",
  },
  ".cm-panels": { backgroundColor: color.bgPage, color: color.textPrimary },
  ".cm-panels-bottom": { borderTop: `1px solid ${color.borderDefault}` },
  ".cm-placeholder": { color: color.textPlaceholder },
  // The editor grows with its text and the page scrolls, so the editor never
  // scrolls itself. Otherwise the cursor poking a pixel past the last line
  // (as vim's half-height one does after "d") flashes a scrollbar.
  ".cm-scroller": { overflow: "visible" },
  // The ":" and "/" prompts.
  ".cm-vim-panel": {
    fontFamily: font.mono,
    fontSize: "13px",
    lineHeight: "28px",
    padding: 0,
  },
  ".cm-vim-panel input": { color: "inherit", fontFamily: "inherit" },
  // Normal mode's block cursor, over the letter it is on.
  ".cm-vimCursorLayer .cm-fat-cursor": {
    backgroundColor: color.accent,
    borderRadius: "2px",
    color: color.textOnAccent,
  },
});
