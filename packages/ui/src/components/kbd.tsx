import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, radius } from "../tokens.stylex.ts";

const styles = stylex.create({
  kbd: {
    alignItems: "center",
    backgroundColor: color.bgPage,
    borderColor: color.borderDefault,
    borderRadius: radius.sm,
    borderStyle: "solid",
    borderWidth: 1,
    color: color.textSecondary,
    display: "inline-flex",
    fontFamily: font.family,
    fontSize: font.size11,
    fontWeight: font.weightMedium,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingInline: 6,
  },
});

/** A keyboard key or shortcut, such as ⌘N or Esc. */
export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd {...stylex.props(styles.kbd)}>{children}</kbd>
);
