import * as stylex from "@stylexjs/stylex";

import { color, font, radius, space } from "../../tokens.stylex.ts";
import type { CursorPosition } from "./markdown-editor.tsx";
import type { VimMode } from "./vim.ts";

const styles = stylex.create({
  line: {
    alignItems: "center",
    borderTopColor: color.borderDefault,
    borderTopStyle: "solid",
    borderTopWidth: 1,
    color: color.textTertiary,
    display: "flex",
    flexShrink: 0,
    fontFamily: font.mono,
    fontSize: font.size11,
    height: 28,
    justifyContent: "space-between",
    paddingInline: space.s5,
  },
  mode: {
    backgroundColor: color.accentSubtle,
    borderRadius: radius.xs,
    color: color.accent,
    fontWeight: font.weightBold,
    letterSpacing: "0.04em",
    paddingBlock: 2,
    paddingInline: 6,
    textTransform: "uppercase",
  },
});

export interface VimModeLineProps {
  mode: VimMode;
  cursor: CursorPosition;
}

/** Vim's mode line: the mode on the left, the cursor's line:column on the right. */
export const VimModeLine = ({ mode, cursor }: VimModeLineProps) => (
  <div {...stylex.props(styles.line)}>
    <output aria-label="Vim mode" {...stylex.props(styles.mode)}>
      {mode}
    </output>
    <output aria-label="Cursor position">
      {`${cursor.line}:${cursor.column}`}
    </output>
  </div>
);
