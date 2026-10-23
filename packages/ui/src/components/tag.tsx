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
    gap: space.s1,
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
  },
});

export const Tag = ({
  children,
  tone = "gray",
  variant = "soft",
  icon,
}: TagProps) => (
  <span
    {...stylex.props(
      styles.base,
      variant === "soft" ? toneStyles[tone] : styles.outline
    )}
  >
    {icon}
    {children}
  </span>
);
