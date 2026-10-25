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
  ".cm-content": {
    caretColor: color.accent,
    fontFamily: font.family,
    fontSize: "16px",
    lineHeight: "26px",
    padding: 0,
  },
  ".cm-cursor": { borderLeftColor: color.accent, borderLeftWidth: "2px" },
  ".cm-line": { padding: 0 },
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
  ".cm-placeholder": { color: color.textPlaceholder },
});
