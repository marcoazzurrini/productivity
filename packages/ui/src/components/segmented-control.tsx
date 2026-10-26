import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, motion, radius, shadow } from "../tokens.stylex.ts";

export interface SegmentOption {
  value: string;
  /** The visible text, or the accessible name and tooltip of an icon. */
  label: string;
  /** Shows this in place of the label. */
  icon?: ReactNode;
}

export interface SegmentedControlProps {
  /** Names the group for screen readers. */
  label: string;
  value: string;
  options: readonly SegmentOption[];
  onValueChange: (value: string) => void;
  /** "segmented" sits in a grey track; "pills" are free-standing filter chips. */
  variant?: "segmented" | "pills";
  /** "small" fits beside a sidebar row. Segmented only. */
  size?: "default" | "small";
}

const styles = stylex.create({
  item: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderStyle: "none",
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    color: { ":hover": color.textSecondary, default: color.textTertiary },
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: font.family,
    fontSize: font.size13,
    fontWeight: font.weightMedium,
    height: 26,
    outline: "none",
    paddingInline: 10,
    transitionDuration: motion.fast,
    transitionProperty: "background-color, color",
  },
  pill: {
    borderRadius: radius.full,
  },
  pillPressed: {
    backgroundColor: color.bgPressed,
    color: { ":hover": color.textPrimary, default: color.textPrimary },
  },
  pills: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  segment: {
    borderRadius: radius.sm,
    height: 24,
  },
  segmentPressed: {
    backgroundColor: color.bgRaised,
    boxShadow: shadow.raised,
    color: { ":hover": color.textPrimary, default: color.textPrimary },
  },
  small: {
    height: 20,
    justifyContent: "center",
    paddingInline: 0,
    width: 26,
  },
  smallTrack: {
    gap: 0,
  },
  track: {
    backgroundColor: color.bgHover,
    borderRadius: radius.md,
    display: "inline-flex",
    gap: 2,
    padding: 2,
  },
});

/** Pick one option from a few, such as Day / Week / Month or a context filter. */
export const SegmentedControl = ({
  label,
  value,
  options,
  onValueChange,
  variant = "segmented",
  size = "default",
}: SegmentedControlProps) => (
  <ToggleGroup
    aria-label={label}
    onValueChange={(next) => {
      const [first] = next;

      if (first !== undefined) {
        onValueChange(first);
      }
    }}
    value={[value]}
    {...stylex.props(
      variant === "segmented" ? styles.track : styles.pills,
      variant === "segmented" && size === "small" && styles.smallTrack
    )}
  >
    {options.map((option) => {
      const pressed = option.value === value;

      return (
        <Toggle
          aria-label={option.icon === undefined ? undefined : option.label}
          key={option.value}
          title={option.icon === undefined ? undefined : option.label}
          value={option.value}
          {...stylex.props(
            styles.item,
            variant === "segmented" ? styles.segment : styles.pill,
            variant === "segmented" && size === "small" && styles.small,
            pressed &&
              (variant === "segmented"
                ? styles.segmentPressed
                : styles.pillPressed)
          )}
        >
          {option.icon ?? option.label}
        </Toggle>
      );
    })}
  </ToggleGroup>
);
