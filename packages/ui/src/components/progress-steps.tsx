import { Progress } from "@base-ui/react/progress";
import * as stylex from "@stylexjs/stylex";

import { color, font, motion, radius, space } from "../tokens.stylex.ts";

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

export interface ProgressBarProps {
  /** Names the progress for screen readers: "Weekly Review progress". */
  label: string;
  /** Steps finished so far. */
  done: number;
  total: number;
  /** Shown on the right, such as "4 of 10 steps". */
  caption?: string;
  /** "violet" is the Weekly Review's color. */
  tone?: "accent" | "violet";
}

const barStyles = stylex.create({
  accent: { backgroundColor: color.accent },
  caption: {
    color: color.textSecondary,
    fontFamily: font.family,
    fontSize: font.size12,
    fontWeight: font.weightMedium,
    whiteSpace: "nowrap",
  },
  fill: {
    borderRadius: radius.full,
    height: "100%",
    transitionDuration: motion.normal,
    transitionProperty: "width",
  },
  root: {
    alignItems: "center",
    display: "flex",
    gap: space.s3,
  },
  track: {
    backgroundColor: color.bgHover,
    borderRadius: radius.full,
    flexGrow: 1,
    height: 6,
    overflow: "hidden",
  },
  violet: { backgroundColor: color.illustrationViolet },
});

/** One bar that fills as steps get done, for a checklist of many steps. */
export const ProgressBar = ({
  label,
  done,
  total,
  caption,
  tone = "accent",
}: ProgressBarProps) => (
  <Progress.Root
    aria-label={label}
    max={total}
    value={done}
    {...stylex.props(barStyles.root)}
  >
    <Progress.Track {...stylex.props(barStyles.track)}>
      <Progress.Indicator {...stylex.props(barStyles.fill, barStyles[tone])} />
    </Progress.Track>
    {caption === undefined ? null : (
      <span {...stylex.props(barStyles.caption)}>{caption}</span>
    )}
  </Progress.Root>
);
