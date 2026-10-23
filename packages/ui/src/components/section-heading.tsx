import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, space } from "../tokens.stylex.ts";

export interface SectionHeadingProps {
  title: string;
  count?: number;
  /** Controls at the right end, such as a menu button. */
  actions?: ReactNode;
}

const styles = stylex.create({
  count: {
    color: color.textTertiary,
    fontSize: font.size13,
    fontWeight: font.weightMedium,
  },
  heading: {
    alignItems: "flex-end",
    borderBottomColor: color.borderDefault,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    display: "flex",
    gap: space.s2,
    minHeight: 40,
    paddingBottom: space.s2,
  },
  spacer: { flexGrow: 1 },
  title: {
    color: color.textLink,
    fontFamily: font.family,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
    margin: 0,
  },
});

export const SectionHeading = ({
  title,
  count,
  actions,
}: SectionHeadingProps) => (
  <div {...stylex.props(styles.heading)}>
    <h2 {...stylex.props(styles.title)}>{title}</h2>
    {count === undefined ? null : (
      <span {...stylex.props(styles.count)}>{count}</span>
    )}
    <span {...stylex.props(styles.spacer)} />
    {actions}
  </div>
);
