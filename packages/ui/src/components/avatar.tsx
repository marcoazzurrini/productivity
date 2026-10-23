import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { font, radius } from "../tokens.stylex.ts";
import { toneStyles } from "./tone.ts";
import type { Tone } from "./tone.ts";
import { VisuallyHidden } from "./visually-hidden.tsx";

export interface AvatarProps {
  /** The person or organisation. Initials are taken from it. */
  name: string;
  tone?: Tone;
  /** Replaces the initials, for things that are not people (a shop, a parcel). */
  icon?: ReactNode;
}

const styles = stylex.create({
  avatar: {
    alignItems: "center",
    borderRadius: radius.full,
    display: "inline-flex",
    flexShrink: 0,
    fontFamily: font.family,
    fontSize: font.size12,
    fontWeight: font.weightSemibold,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
});

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/u)
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

export const Avatar = ({ name, tone = "gray", icon }: AvatarProps) => (
  <span {...stylex.props(styles.avatar, toneStyles[tone])}>
    <span aria-hidden>{icon ?? initialsOf(name)}</span>
    <VisuallyHidden>{name}</VisuallyHidden>
  </span>
);
