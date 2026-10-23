import { Button as BaseButton } from "@base-ui/react/button";
import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";

import { color, motion, radius, shadow } from "../tokens.stylex.ts";

export interface IconButtonProps extends Omit<
  ComponentProps<typeof BaseButton>,
  "className" | "style" | "children" | "aria-label"
> {
  /** Read by screen readers and shown as a tooltip. Icon buttons have no visible text. */
  label: string;
  icon: ReactNode;
  tone?: "neutral" | "accent";
  xstyle?: stylex.StyleXStyles;
}

const styles = stylex.create({
  accent: {
    backgroundColor: {
      ":active": color.accentPressed,
      ":hover": color.accentHover,
      default: color.accent,
    },
    boxShadow: {
      ":focus-visible": shadow.focus,
      default: "0 1px 2px rgba(5, 130, 255, 0.25)",
    },
    color: color.textOnAccent,
  },
  base: {
    alignItems: "center",
    borderRadius: radius.md,
    borderStyle: "none",
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    height: 28,
    justifyContent: "center",
    outline: "none",
    padding: 0,
    transitionDuration: motion.fast,
    transitionProperty: "background-color, color",
    width: 28,
  },
  neutral: {
    backgroundColor: {
      ":active": color.bgPressed,
      ":hover": color.bgHover,
      default: "transparent",
    },
    color: { ":hover": color.textSecondary, default: color.textTertiary },
  },
});

export const IconButton = ({
  label,
  icon,
  tone = "neutral",
  xstyle,
  ...rest
}: IconButtonProps) => (
  <BaseButton
    {...rest}
    aria-label={label}
    title={label}
    {...stylex.props(styles.base, styles[tone], xstyle)}
  >
    {icon}
  </BaseButton>
);
