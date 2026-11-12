import { color } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  accent: { color: color.accent },
  muted: { color: color.iconMuted },
  pie: { flexShrink: 0 },
});

/** The radius of the filled wedge, inside the ring. */
const wedge = 4.5;

/**
 * A small pie that fills as a project's actions get done. Muted beside a
 * project's name in a list, accent at the top of the project's own page.
 */
export const ProjectPie = ({
  done,
  total,
  size = 16,
  tone = "muted",
}: {
  done: number;
  total: number;
  /** The width and height in pixels. */
  size?: number;
  tone?: "muted" | "accent";
}) => {
  const share = total === 0 ? 0 : done / total;
  const angle = share * 2 * Math.PI;
  const x = 8 + wedge * Math.sin(angle);
  const y = 8 - wedge * Math.cos(angle);
  const largeArc = share > 0.5 ? 1 : 0;

  return (
    <svg
      aria-hidden
      fill="none"
      height={size}
      viewBox="0 0 16 16"
      width={size}
      {...stylex.props(styles.pie, styles[tone])}
    >
      <circle cx={8} cy={8} r={6.5} stroke="currentColor" strokeWidth={1.5} />
      {share >= 1 ? (
        <circle cx={8} cy={8} fill="currentColor" r={wedge} />
      ) : null}
      {share > 0 && share < 1 ? (
        <path
          d={`M8 8 L8 ${8 - wedge} A${wedge} ${wedge} 0 ${largeArc} 1 ${x} ${y} Z`}
          fill="currentColor"
        />
      ) : null}
    </svg>
  );
};
