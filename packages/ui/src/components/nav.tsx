import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import {
  color,
  font,
  motion,
  radius,
  shadow,
  space,
} from "../tokens.stylex.ts";

export interface NavItemProps {
  label: string;
  icon: ReactNode;
  /** A quiet count after the label. */
  count?: number;
  /** Something more urgent than the count, such as a red badge or a due date. */
  badge?: ReactNode;
  selected?: boolean;
  /** Group headings (an area) are bold and cannot be selected. */
  emphasis?: "default" | "strong" | "quiet";
  onSelect?: () => void;
}

const styles = stylex.create({
  count: {
    color: color.textTertiary,
    fontSize: font.size13,
    fontVariantNumeric: "tabular-nums",
  },
  icon: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    height: 16,
    justifyContent: "center",
    width: 16,
  },
  item: {
    alignItems: "center",
    backgroundColor: {
      ":active": color.bgPressed,
      ":hover": color.bgHover,
      default: "transparent",
    },
    borderRadius: radius.md,
    borderStyle: "none",
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    color: color.textPrimary,
    cursor: "pointer",
    display: "flex",
    fontFamily: font.family,
    fontSize: font.size14,
    fontWeight: font.weightMedium,
    gap: 10,
    height: 30,
    outline: "none",
    paddingInline: 10,
    textAlign: "start",
    transitionDuration: motion.fast,
    transitionProperty: "background-color",
    width: "100%",
  },
  label: {
    flexGrow: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  quiet: {
    color: color.textSecondary,
    fontWeight: font.weightRegular,
    height: 28,
  },
  section: {
    color: color.textTertiary,
    fontFamily: font.family,
    fontSize: font.size11,
    fontWeight: font.weightSemibold,
    letterSpacing: "0.03em",
    margin: 0,
    paddingBottom: 6,
    paddingInline: 10,
    paddingTop: space.s4,
    textTransform: "uppercase",
  },
  selected: {
    backgroundColor: color.bgPressed,
  },
  strong: {
    cursor: "default",
    fontWeight: font.weightSemibold,
  },
  strongIdle: {
    backgroundColor: { ":hover": "transparent", default: "transparent" },
  },
});

/** One destination in the sidebar: a list, a context or a project. */
export const NavItem = ({
  label,
  icon,
  count,
  badge,
  selected = false,
  emphasis = "default",
  onSelect,
}: NavItemProps) => {
  const content = (
    <>
      <span aria-hidden {...stylex.props(styles.icon)}>
        {icon}
      </span>
      <span {...stylex.props(styles.label)}>{label}</span>
      {badge}
      {count === undefined ? null : (
        <span {...stylex.props(styles.count)}>{count}</span>
      )}
    </>
  );

  if (emphasis === "strong") {
    return (
      <div {...stylex.props(styles.item, styles.strong, styles.strongIdle)}>
        {content}
      </div>
    );
  }

  return (
    <button
      aria-current={selected ? "page" : undefined}
      onClick={onSelect}
      type="button"
      {...stylex.props(
        styles.item,
        emphasis === "quiet" && styles.quiet,
        selected && styles.selected
      )}
    >
      {content}
    </button>
  );
};

/** A small uppercase heading that groups sidebar items. */
export const NavSection = ({ children }: { children: ReactNode }) => (
  <h2 {...stylex.props(styles.section)}>{children}</h2>
);
