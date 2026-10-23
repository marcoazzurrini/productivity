import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, radius, space } from "../tokens.stylex.ts";

export interface BannerProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** The one thing to do about it, usually a primary button. */
  action?: ReactNode;
}

const styles = stylex.create({
  banner: {
    alignItems: "center",
    backgroundColor: color.accentSubtle,
    borderRadius: radius.lg,
    display: "flex",
    fontFamily: font.family,
    gap: space.s4,
    padding: space.s4,
  },
  description: {
    color: color.textSecondary,
    fontSize: font.size13,
    lineHeight: "19px",
    margin: 0,
  },
  icon: {
    alignItems: "center",
    backgroundColor: color.bgPage,
    borderRadius: radius.lg,
    color: color.accent,
    display: "flex",
    flexShrink: 0,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: 2,
  },
  title: {
    color: color.textPrimary,
    fontSize: font.size14,
    fontWeight: font.weightSemibold,
    margin: 0,
  },
});

/** A highlighted call to action at the top of a list. */
export const Banner = ({ title, description, icon, action }: BannerProps) => (
  <section aria-label={title} {...stylex.props(styles.banner)}>
    {icon === undefined ? null : (
      <span aria-hidden {...stylex.props(styles.icon)}>
        {icon}
      </span>
    )}
    <div {...stylex.props(styles.text)}>
      <p {...stylex.props(styles.title)}>{title}</p>
      {description === undefined ? null : (
        <p {...stylex.props(styles.description)}>{description}</p>
      )}
    </div>
    {action}
  </section>
);
