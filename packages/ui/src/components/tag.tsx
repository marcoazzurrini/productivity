import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, radius, space } from "../tokens.stylex.ts";
import { toneStyles } from "./tone.ts";
import type { Tone } from "./tone.ts";

export interface TagProps {
  children: ReactNode;
  tone?: Tone;
  /** Outline tags carry less weight, for secondary facts like a context. */
  variant?: "soft" | "outline";
  /** "small" is the chip at the end of a task row. */
  size?: "default" | "small";
  icon?: ReactNode;
}

const styles = stylex.create({
  base: {
    alignItems: "center",
    borderRadius: radius.sm,
    display: "inline-flex",
    flexShrink: 0,
    fontFamily: font.family,
    fontSize: font.size12,
    fontWeight: font.weightMedium,
    gap: 5,
    height: 22,
    lineHeight: 1,
    paddingInline: 7,
    whiteSpace: "nowrap",
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: color.borderStrong,
    borderRadius: radius.full,
    borderStyle: "solid",
    borderWidth: 1,
    color: color.textTertiary,
    fontWeight: font.weightRegular,
    height: 20,
    paddingInline: space.s2,
  },
  small: { height: 20, paddingInline: 6 },
});

export const Tag = ({
  children,
  tone = "gray",
  variant = "soft",
  size = "default",
  icon,
}: TagProps) => (
  <span
    {...stylex.props(
      styles.base,
      size === "small" && styles.small,
      variant === "soft" ? toneStyles[tone] : styles.outline
    )}
  >
    {icon}
    {children}
  </span>
);
