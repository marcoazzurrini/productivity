import {
  color,
  font,
  radius,
  shadow,
  space,
  tag,
} from "@productivity/ui/tokens.stylex";
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  },
  label: {
    color: color.textPrimary,
    fontSize: font.size13,
    fontWeight: font.weightMedium,
  },
  radius: {
    backgroundColor: color.accentSubtle,
    borderColor: color.accent,
    borderStyle: "solid",
    borderWidth: 1,
    height: 64,
    width: 64,
  },
  row: { alignItems: "center", display: "flex", gap: 16 },
  shadowBox: { backgroundColor: color.bgCard, height: 80, width: 160 },
  space: { backgroundColor: color.accent, height: 12 },
  stack: { display: "flex", flexDirection: "column", gap: 12 },
  swatch: {
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    borderStyle: "solid",
    borderWidth: 1,
    height: 56,
  },
  value: {
    color: color.textTertiary,
    fontFamily: font.mono,
    fontSize: font.size12,
  },
});

/** Swatches take their color from the StyleX variable, so they always match the code. */
const swatches = stylex.create({
  accent: { backgroundColor: color.accent },
  accentSubtle: { backgroundColor: color.accentSubtle },
  bgHover: { backgroundColor: color.bgHover },
  bgPage: { backgroundColor: color.bgPage },
  bgPressed: { backgroundColor: color.bgPressed },
  bgSidebar: { backgroundColor: color.bgSidebar },
  borderStrong: { backgroundColor: color.borderStrong },
  inverse: { backgroundColor: color.inverse },
  nowLine: { backgroundColor: color.nowLine },
  textLink: { backgroundColor: color.textLink },
  textSecondary: { backgroundColor: color.textSecondary },
  textTertiary: { backgroundColor: color.textTertiary },
});

const tagSwatches = stylex.create({
  blue: { backgroundColor: tag.blueBg, color: tag.blueFg },
  brown: { backgroundColor: tag.brownBg, color: tag.brownFg },
  gray: { backgroundColor: tag.grayBg, color: tag.grayFg },
  green: { backgroundColor: tag.greenBg, color: tag.greenFg },
  orange: { backgroundColor: tag.orangeBg, color: tag.orangeFg },
  pink: { backgroundColor: tag.pinkBg, color: tag.pinkFg },
  purple: { backgroundColor: tag.purpleBg, color: tag.purpleFg },
  red: { backgroundColor: tag.redBg, color: tag.redFg },
  yellow: { backgroundColor: tag.yellowBg, color: tag.yellowFg },
});

const typeScale = stylex.create({
  body: { fontSize: font.size14 },
  caption: { color: color.textTertiary, fontSize: font.size12 },
  heading: { fontSize: font.size20, fontWeight: font.weightSemibold },
  section: {
    color: color.textLink,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
  },
  title: {
    fontSize: font.size32,
    fontWeight: font.weightBold,
    letterSpacing: "-0.025em",
  },
});

const spaceSteps = stylex.create({
  s1: { width: space.s1 },
  s12: { width: space.s12 },
  s16: { width: space.s16 },
  s2: { width: space.s2 },
  s3: { width: space.s3 },
  s4: { width: space.s4 },
  s6: { width: space.s6 },
  s8: { width: space.s8 },
});

const radii = stylex.create({
  full: { borderRadius: radius.full },
  lg: { borderRadius: radius.lg },
  md: { borderRadius: radius.md },
  sm: { borderRadius: radius.sm },
  xl: { borderRadius: radius.xl },
  xxl: { borderRadius: radius.xxl },
});

const shadows = stylex.create({
  card: { boxShadow: shadow.card },
  popover: { boxShadow: shadow.popover },
  window: { boxShadow: shadow.window },
});

const meta = { title: "Foundations" } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Colors: Story = {
  render: () => (
    <div {...stylex.props(styles.grid)}>
      {Object.entries(swatches).map(([name, style]) => (
        <div key={name} {...stylex.props(styles.stack)}>
          <div {...stylex.props(styles.swatch, style)} />
          <span {...stylex.props(styles.label)}>color.{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const TagColors: Story = {
  render: () => (
    <div {...stylex.props(styles.grid)}>
      {Object.entries(tagSwatches).map(([name, style]) => (
        <div
          key={name}
          {...stylex.props(styles.swatch, style, styles.row)}
          style={{ paddingInline: 12 }}
        >
          {name}
        </div>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div {...stylex.props(styles.stack)}>
      <span {...stylex.props(typeScale.title)}>Page title · 32 / Bold</span>
      <span {...stylex.props(typeScale.heading)}>
        Item title · 20 / Semibold
      </span>
      <span {...stylex.props(typeScale.section)}>
        Section heading · 15 / Semibold
      </span>
      <span {...stylex.props(typeScale.body)}>
        Body and task titles · 14 / Regular
      </span>
      <span {...stylex.props(typeScale.caption)}>
        Meta and captions · 12 / Regular
      </span>
    </div>
  ),
};

export const Spacing: Story = {
  render: () => (
    <div {...stylex.props(styles.stack)}>
      {Object.entries(spaceSteps).map(([name, style]) => (
        <div key={name} {...stylex.props(styles.row)}>
          <span {...stylex.props(styles.value)} style={{ width: 48 }}>
            {name}
          </span>
          <div {...stylex.props(styles.space, style)} />
        </div>
      ))}
    </div>
  ),
};

export const Radius: Story = {
  render: () => (
    <div {...stylex.props(styles.row)}>
      {Object.entries(radii).map(([name, style]) => (
        <div key={name} {...stylex.props(styles.stack)}>
          <div {...stylex.props(styles.radius, style)} />
          <span {...stylex.props(styles.value)}>{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const Shadows: Story = {
  render: () => (
    <div {...stylex.props(styles.row)} style={{ gap: 40, padding: 24 }}>
      {Object.entries(shadows).map(([name, style]) => (
        <div key={name} {...stylex.props(styles.stack)}>
          <div {...stylex.props(styles.shadowBox, style)} />
          <span {...stylex.props(styles.value)}>{name}</span>
        </div>
      ))}
    </div>
  ),
};
