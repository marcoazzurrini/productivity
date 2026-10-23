import { Progress } from "@base-ui/react/progress";
import * as stylex from "@stylexjs/stylex";

import { color, font, radius, space } from "../tokens.stylex.ts";

export interface ProgressStepsProps {
  /** Names the progress for screen readers: "Clarifying the inbox". */
  label: string;
  /** Steps finished so far. */
  done: number;
  total: number;
  /** Shown on the right, such as "Item 3 of 7". */
  caption?: string;
}

const styles = stylex.create({
  caption: {
    color: color.textTertiary,
    fontFamily: font.family,
    fontSize: font.size13,
    whiteSpace: "nowrap",
  },
  done: { backgroundColor: color.accent },
  root: {
    alignItems: "center",
    display: "flex",
    gap: space.s3,
  },
  segment: {
    backgroundColor: color.bgPressed,
    borderRadius: radius.full,
    flexGrow: 1,
    height: 4,
  },
  track: {
    display: "flex",
    flexGrow: 1,
    gap: space.s1,
  },
});

/** A bar split into one segment per step, so the end is always in sight. */
export const ProgressSteps = ({
  label,
  done,
  total,
  caption,
}: ProgressStepsProps) => (
  <Progress.Root
    aria-label={label}
    max={total}
    value={done}
    {...stylex.props(styles.root)}
  >
    <Progress.Track {...stylex.props(styles.track)}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          {...stylex.props(styles.segment, index < done && styles.done)}
        />
      ))}
    </Progress.Track>
    {caption === undefined ? null : (
      <span {...stylex.props(styles.caption)}>{caption}</span>
    )}
  </Progress.Root>
);
