import * as stylex from "@stylexjs/stylex";

import { color, font, radius } from "../tokens.stylex.ts";

const styles = stylex.create({
  badge: {
    alignItems: "center",
    backgroundColor: color.nowLine,
    borderRadius: radius.full,
    color: color.textOnAccent,
    display: "inline-flex",
    fontFamily: font.family,
    fontSize: font.size11,
    fontWeight: font.weightSemibold,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingInline: 4,
  },
});

/** A red count that demands attention, such as overdue follow-ups. */
export const CountBadge = ({
  count,
  label,
}: {
  count: number;
  label: string;
}) => (
  <span aria-label={label} {...stylex.props(styles.badge)}>
    {count}
  </span>
);
