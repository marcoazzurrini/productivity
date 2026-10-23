import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, space } from "../tokens.stylex.ts";

export interface PageHeaderProps {
  title: string;
  icon?: ReactNode;
  description?: ReactNode;
  /** Text or controls on the right of the title, such as a count or date. */
  aside?: ReactNode;
  /** Filters or tabs under the description. */
  children?: ReactNode;
}

const styles = stylex.create({
  aside: {
    color: color.textTertiary,
    fontSize: font.size13,
    marginInlineStart: "auto",
  },
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
    gap: 14,
  },
  icon: { display: "flex" },
  title: {
    color: color.textPrimary,
    fontSize: font.size32,
    fontWeight: font.weightBold,
    letterSpacing: "-0.025em",
    lineHeight: 1.15,
    margin: 0,
  },
  titleRow: {
    alignItems: "center",
    display: "flex",
    gap: space.s3,
  },
});

export const PageHeader = ({
  title,
  icon,
  description,
  aside,
  children,
}: PageHeaderProps) => (
  <header {...stylex.props(styles.header)}>
    <div {...stylex.props(styles.titleRow)}>
      {icon === undefined ? null : (
        <span aria-hidden {...stylex.props(styles.icon)}>
          {icon}
        </span>
      )}
      <h1 {...stylex.props(styles.title)}>{title}</h1>
      {aside === undefined ? null : (
        <span {...stylex.props(styles.aside)}>{aside}</span>
      )}
    </div>
    {description === undefined ? null : (
      <p {...stylex.props(styles.description)}>{description}</p>
    )}
    {children}
  </header>
);
