import { Button as BaseButton } from "@base-ui/react/button";
import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";

import {
  color,
  font,
  motion,
  radius,
  shadow,
  space,
} from "../tokens.stylex.ts";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

export type ButtonSize = "large" | "small";

export interface ButtonProps extends Omit<
  ComponentProps<typeof BaseButton>,
  "className" | "style"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** An icon shown before the label. */
  icon?: ReactNode;
  /** A keyboard shortcut hint shown after the label. */
  shortcut?: string;
  xstyle?: stylex.StyleXStyles;
}

const styles = stylex.create({
  base: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: radius.md,
    borderStyle: "solid",
    borderWidth: 1,
    boxShadow: {
      ":focus-visible": shadow.focus,
      default: null,
    },
    cursor: { ":disabled": "not-allowed", default: "pointer" },
    display: "inline-flex",
    flexShrink: 0,
    fontFamily: font.family,
    fontWeight: font.weightMedium,
    gap: space.s2,
    justifyContent: "center",
    opacity: { ":disabled": 0.5, default: 1 },
    outline: "none",
    transitionDuration: motion.fast,
    transitionProperty: "background-color, border-color, color",
    userSelect: "none",
    whiteSpace: "nowrap",
  },
  ghost: {
    backgroundColor: {
      ":active": color.bgPressed,
      ":hover": color.bgHover,
      default: "transparent",
    },
    color: color.textSecondary,
  },
  large: {
    fontSize: font.size14,
    height: 36,
    paddingInline: space.s4,
  },
  outline: {
    backgroundColor: {
      ":active": color.bgPressed,
      ":hover": color.bgHover,
      default: color.bgPage,
    },
    borderColor: color.borderStrong,
    color: color.textPrimary,
  },
  primary: {
    backgroundColor: {
      ":active": color.accentPressed,
      ":hover": color.accentHover,
      default: color.accent,
    },
    color: color.textOnAccent,
  },
  secondary: {
    backgroundColor: {
      ":active": color.bgPressed,
      ":hover": color.bgPressed,
      default: color.bgHover,
    },
    color: color.textPrimary,
  },
  shortcut: {
    fontSize: font.size12,
    fontWeight: font.weightRegular,
    opacity: 0.7,
  },
  small: {
    fontSize: font.size13,
    height: 28,
    paddingInline: space.s3,
  },
});

export const Button = ({
  variant = "secondary",
  size = "large",
  icon,
  shortcut,
  children,
  xstyle,
  ...rest
}: ButtonProps) => (
  <BaseButton
    {...rest}
    {...stylex.props(styles.base, styles[variant], styles[size], xstyle)}
  >
    {icon}
    {children}
    {shortcut === undefined ? null : (
      <span {...stylex.props(styles.shortcut)}>{shortcut}</span>
    )}
  </BaseButton>
);
