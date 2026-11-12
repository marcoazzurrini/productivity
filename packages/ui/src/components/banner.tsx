import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, space } from "../tokens.stylex.ts";

export interface BannerProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** The one thing to do about it, usually a primary button. */
  action?: ReactNode;
  /** A quiet line under the action, such as its keyboard shortcut. */
  actionHint?: string;
}

const styles = stylex.create({
  action: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    gap: 6,
  },
  actionHint: { color: color.textTertiary, fontSize: font.size11 },
  banner: {
    alignItems: "center",
    backgroundColor: color.accentSubtle,
    borderRadius: 10,
    display: "flex",
    fontFamily: font.family,
    gap: space.s4,
    padding: space.s5,
  },
  description: {
    color: color.textSecondary,
    fontSize: font.size13,
    lineHeight: "18px",
    margin: 0,
  },
  icon: {
    alignItems: "center",
    backgroundColor: color.bgPage,
    borderRadius: 10,
    color: color.accent,
    display: "flex",
    flexShrink: 0,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: space.s1,
  },
  title: {
    color: color.textPrimary,
    fontSize: 16,
    fontWeight: font.weightSemibold,
    margin: 0,
  },
});

/** A highlighted call to action at the top of a list. */
export const Banner = ({
  title,
  description,
  icon,
  action,
  actionHint,
}: BannerProps) => (
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
    {action === undefined ? null : (
      <div {...stylex.props(styles.action)}>
        {action}
        {actionHint === undefined ? null : (
          <span {...stylex.props(styles.actionHint)}>{actionHint}</span>
        )}
      </div>
    )}
  </section>
);
