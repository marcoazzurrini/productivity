import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, space } from "../tokens.stylex.ts";

export interface PageHeaderProps {
  title: string;
  icon?: ReactNode;
  /** A control right after the title, such as the page's "…" menu. */
  titleAction?: ReactNode;
  description?: ReactNode;
  /** Text or controls on the right of the title, such as a count or date. */
  aside?: ReactNode;
  /** Filters or tabs under the description. */
  children?: ReactNode;
  /** Pulls the description closer to the title, for a line of facts. */
  compact?: boolean;
}

const styles = stylex.create({
  aside: {
    color: color.textTertiary,
    fontSize: font.size14,
    marginInlineStart: "auto",
  },
  compact: { gap: space.s2 },
  // One line of facts needs no reading leading.
  compactDescription: { lineHeight: "normal" },
  description: {
    color: color.textSecondary,
    fontSize: font.size15,
    lineHeight: "22px",
    margin: 0,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    gap: space.s3,
  },
  icon: { display: "flex" },
  title: {
    color: color.textPrimary,
    fontSize: font.size32,
    fontWeight: font.weightBold,
    letterSpacing: "-0.025em",
    lineHeight: 1.2,
    margin: 0,
  },
  titleRow: {
    alignItems: "center",
    display: "flex",
    gap: space.s3,
  },
  // A header that ends in controls gets a little more room for them.
  withControls: { gap: 14 },
});

export const PageHeader = ({
  title,
  icon,
  titleAction,
  description,
  aside,
  children,
  compact = false,
}: PageHeaderProps) => (
  <header
    {...stylex.props(
      styles.header,
      children !== undefined && children !== null && styles.withControls,
      compact && styles.compact
    )}
  >
    <div {...stylex.props(styles.titleRow)}>
      {icon === undefined ? null : (
        <span aria-hidden {...stylex.props(styles.icon)}>
          {icon}
        </span>
      )}
      <h1 {...stylex.props(styles.title)}>{title}</h1>
      {titleAction}
      {aside === undefined ? null : (
        <span {...stylex.props(styles.aside)}>{aside}</span>
      )}
    </div>
    {description === undefined ? null : (
      <p
        {...stylex.props(
          styles.description,
          compact && styles.compactDescription
        )}
      >
        {description}
      </p>
    )}
    {children}
  </header>
);
