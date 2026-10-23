import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import * as stylex from "@stylexjs/stylex";

import { color, font, motion, radius, shadow } from "../tokens.stylex.ts";

export interface SegmentOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  /** Names the group for screen readers. */
  label: string;
  value: string;
  options: readonly SegmentOption[];
  onValueChange: (value: string) => void;
  /** "segmented" sits in a grey track; "pills" are free-standing filter chips. */
  variant?: "segmented" | "pills";
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
    backgroundColor: color.bgPage,
    boxShadow: "0 1px 2px rgba(15, 15, 15, 0.1)",
    color: { ":hover": color.textPrimary, default: color.textPrimary },
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
    {...stylex.props(variant === "segmented" ? styles.track : styles.pills)}
  >
    {options.map((option) => {
      const pressed = option.value === value;

      return (
        <Toggle
          key={option.value}
          value={option.value}
          {...stylex.props(
            styles.item,
            variant === "segmented" ? styles.segment : styles.pill,
            pressed &&
              (variant === "segmented"
                ? styles.segmentPressed
                : styles.pillPressed)
          )}
        >
          {option.label}
        </Toggle>
      );
    })}
  </ToggleGroup>
);
