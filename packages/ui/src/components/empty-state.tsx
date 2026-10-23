import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, space } from "../tokens.stylex.ts";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}

const styles = stylex.create({
  icon: { color: color.textPlaceholder, display: "flex" },
  root: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    gap: space.s2,
    paddingBlock: space.s12,
    textAlign: "center",
  },
  text: {
    color: color.textTertiary,
    fontSize: font.size14,
    margin: 0,
    maxWidth: 360,
  },
  title: {
    color: color.textSecondary,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
    margin: 0,
  },
});

/** What a list shows when there is nothing in it, and why that is good news. */
export const EmptyState = ({ icon, title, children }: EmptyStateProps) => (
  <div {...stylex.props(styles.root)}>
    {icon === undefined ? null : (
      <span aria-hidden {...stylex.props(styles.icon)}>
        {icon}
      </span>
    )}
    <p {...stylex.props(styles.title)}>{title}</p>
    {children === undefined ? null : (
      <p {...stylex.props(styles.text)}>{children}</p>
    )}
  </div>
);
