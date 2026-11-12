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
  /** "secondary" is a darker neutral, for a toolbar's main actions. */
  tone?: "neutral" | "secondary" | "accent";
  /** "large" is 32 px, for toolbars. */
  size?: "medium" | "large";
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
      default: shadow.accent,
    },
    color: color.textOnAccent,
  },
  base: {
    alignItems: "center",
    borderRadius: radius.md,
    borderStyle: "none",
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    cursor: { ":is([data-disabled])": "not-allowed", default: "pointer" },
    display: "inline-flex",
    flexShrink: 0,
    height: 28,
    justifyContent: "center",
    opacity: { ":is([data-disabled])": 0.4, default: 1 },
    outline: "none",
    padding: 0,
    transitionDuration: motion.fast,
    transitionProperty: "background-color, color",
    width: 28,
  },
  large: { height: 32, width: 32 },
  neutral: {
    backgroundColor: {
      ":active": color.bgPressed,
      ":hover": color.bgHover,
      ":is([data-disabled])": "transparent",
      default: "transparent",
    },
    color: { ":hover": color.textSecondary, default: color.textTertiary },
  },
  secondary: {
    backgroundColor: {
      ":active": color.bgPressed,
      ":hover": color.bgHover,
      ":is([data-disabled])": "transparent",
      default: "transparent",
    },
    color: { ":hover": color.textPrimary, default: color.textSecondary },
  },
});

export const IconButton = ({
  label,
  icon,
  tone = "neutral",
  size = "medium",
  xstyle,
  ...rest
}: IconButtonProps) => (
  <BaseButton
    {...rest}
    aria-label={label}
    title={label}
    {...stylex.props(
      styles.base,
      size === "large" && styles.large,
      styles[tone],
      xstyle
    )}
  >
    {icon}
  </BaseButton>
);
