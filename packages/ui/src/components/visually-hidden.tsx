import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

const styles = stylex.create({
  hidden: {
    border: 0,
    clip: "rect(0 0 0 0)",
    height: 1,
    margin: -1,
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    whiteSpace: "nowrap",
    width: 1,
  },
});

/** Text for screen readers only, such as the meaning of an icon. */
export const VisuallyHidden = ({ children }: { children: ReactNode }) => (
  <span {...stylex.props(styles.hidden)}>{children}</span>
);
