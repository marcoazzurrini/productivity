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
  {
    color: color.textPlaceholder,
    tag: [tags.processingInstruction, tags.atom],
  },
]);

/** The air under every line. */
const lineGap = "10px";

/** Room for three digits of line number. */
const numberWidth = 28;

/** Between the line numbers and the text. */
const gutterGap = 40;

/**
 * How far the line numbers hang into the page's margin. The editor pulls
 * itself left by the same 68px, in markdown-editor.tsx.
 */
const gutterWidth = numberWidth + gutterGap;

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
    fontSize: "12px",
  },
  // Every line is a paragraph of its own, with air under it, so a page
  // reads as a document without blank lines between its lines.
  ".cm-line": { padding: `0 0 ${lineGap}` },
  // The lines a ⌘K edit covers, then its proposed new text.
  ".cm-line.cm-inline-edit-line": { backgroundColor: color.bgHover },
  ".cm-line.cm-inline-edit-preview": {
    backgroundColor: color.bgToday,
    boxShadow: `inset 2px 0 0 ${color.accent}`,
  },
  ".cm-lineNumbers .cm-gutterElement": {
    fontVariantNumeric: "tabular-nums",
    lineHeight: "26px",
    // Faint, and far from the text, so the numbers stay out of the way.
    // The width never changes with the count of digits, so the text stays
    // lined up with the page's title.
    opacity: 0.6,
    padding: `0 ${gutterGap}px 0 0`,
    textAlign: "right",
    width: `${gutterWidth}px`,
  },
  // The cursor's line stands out a little, without colour that draws the eye.
  ".cm-lineNumbers .cm-gutterElement.cm-md-current-line": {
    color: color.textTertiary,
    fontWeight: font.weightMedium,
    opacity: 1,
  },
  // A heading's number lines up with the heading, which sits lower.
  ".cm-lineNumbers .cm-gutterElement.cm-md-gutter-h1": { paddingTop: "16px" },
  ".cm-lineNumbers .cm-gutterElement.cm-md-gutter-h2": { paddingTop: "11px" },
  ".cm-lineNumbers .cm-gutterElement.cm-md-gutter-h3": { paddingTop: "10px" },
  ".cm-md-bullet": {
    backgroundColor: color.textSecondary,
    borderRadius: "50%",
    display: "inline-block",
    height: "6px",
    // With the space typed after the mark, the words start 20px in.
    marginInline: "4px 6px",
    verticalAlign: "middle",
    width: "6px",
  },
  // Drawn rather than native, so it matches the app's other checkboxes.
  ".cm-md-checkbox": {
    appearance: "none",
    backgroundColor: color.bgPage,
    border: `1.5px solid ${color.borderStrong}`,
    borderRadius: "4px",
    cursor: "pointer",
    height: "16px",
    // With the space typed after the box, the words start 10px from it.
    margin: "0 6px 0 2px",
    verticalAlign: "-2px",
    width: "16px",
  },
  ".cm-md-checkbox:checked": {
    backgroundColor: color.accent,
    // A white tick, as an image because an input cannot hold an icon.
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E")`,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "12px",
    borderColor: color.accent,
  },
  ".cm-md-done": {
    color: color.textTertiary,
    textDecoration: "line-through",
  },
  ".cm-md-h1": { fontSize: "26px", lineHeight: "32px" },
  ".cm-md-h2": { fontSize: "20px", lineHeight: "24px" },
  ".cm-md-h3": { fontSize: "17px", lineHeight: "24px" },
  ".cm-md-heading": {
    fontWeight: font.weightSemibold,
    letterSpacing: "-0.015em",
    paddingTop: "12px !important",
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
