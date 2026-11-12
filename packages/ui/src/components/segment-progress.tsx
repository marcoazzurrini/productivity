import { Progress } from "@base-ui/react/progress";
import * as stylex from "@stylexjs/stylex";

import { color, space } from "../tokens.stylex.ts";

export interface SegmentProgressProps {
  /** Names the bar for screen readers. */
  label: string;
  /** How many items are finished. The next one is drawn as in progress. */
  done: number;
  total: number;
  /** Read in place of the percentage, such as "Item 3 of 7". */
  valueText?: string;
}

const styles = stylex.create({
  current: { backgroundColor: color.accentMuted },
  done: { backgroundColor: color.accent },
  root: { flexShrink: 0, paddingInline: space.s5 },
  segment: {
    backgroundColor: color.bgHover,
    borderRadius: 2,
    flexBasis: 0,
    flexGrow: 1,
  },
  track: { display: "flex", gap: 3, height: 3 },
});

/**
 * A thin bar under a top bar with one segment per item: finished ones
 * filled, the one in progress lighter, the rest grey.
 */
export const SegmentProgress = ({
  label,
  done,
  total,
  valueText,
}: SegmentProgressProps) => (
  <Progress.Root
    aria-label={label}
    aria-valuetext={valueText}
    max={total}
    value={done}
    {...stylex.props(styles.root)}
  >
    <Progress.Track {...stylex.props(styles.track)}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          {...stylex.props(
            styles.segment,
            index < done && styles.done,
            index === done && styles.current
          )}
        />
      ))}
    </Progress.Track>
  </Progress.Root>
);
