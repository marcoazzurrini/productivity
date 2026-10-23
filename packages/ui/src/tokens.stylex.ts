import * as stylex from "@stylexjs/stylex";

/**
 * Design tokens from the "Foundations" page of design/productivity.fig.
 * StyleX turns each group into CSS custom properties, so a theme can
 * override them without touching components.
 */

export const color = stylex.defineVars({
  accent: "#0582FF",
  accentHover: "#0070E0",
  accentPressed: "#005FC2",
  accentSubtle: "#E9F3FE",
  accentSubtleHover: "#DCEBFD",
  bgCard: "#FFFFFF",
  bgHover: "#F1F1EF",
  bgPage: "#FFFFFF",
  bgPressed: "#E9E9E7",
  bgSidebar: "#F8F8F7",
  bgToday: "#F5F9FF",
  borderDefault: "#E9E9E7",
  borderFocus: "#2383E2",
  borderStrong: "#D3D3D0",
  inverse: "#191918",
  nowLine: "#E03E3E",
  overlay: "rgba(15, 15, 15, 0.35)",
  textLink: "#0B6BCB",
  textOnAccent: "#FFFFFF",
  textOnInverse: "#FFFFFF",
  textPlaceholder: "#B9B9B6",
  textPrimary: "#191918",
  textSecondary: "#5F5E5B",
  textTertiary: "#91918E",
});

/** Notion's tag palette: a soft background and a readable foreground for each hue. */
export const tag = stylex.defineVars({
  blueBg: "#E7F3F8",
  blueFg: "#337EA9",
  brownBg: "#F4EEEE",
  brownFg: "#9F6B53",
  grayBg: "#F1F1EF",
  grayFg: "#787774",
  greenBg: "#EDF3EC",
  greenFg: "#448361",
  orangeBg: "#FBECDD",
  orangeFg: "#D9730D",
  pinkBg: "#F9EEF3",
  pinkFg: "#C14C8A",
  purpleBg: "#F4F0F7",
  purpleFg: "#9065B0",
  redBg: "#FDEBEC",
  redFg: "#D44C47",
  yellowBg: "#FBF3DB",
  yellowFg: "#CB912F",
});

/** A 4 px grid. */
export const space = stylex.defineVars({
  s0: "0px",
  s1: "4px",
  s10: "40px",
  s12: "48px",
  s16: "64px",
  s2: "8px",
  s20: "80px",
  s3: "12px",
  s4: "16px",
  s5: "20px",
  s6: "24px",
  s8: "32px",
});

export const radius = stylex.defineVars({
  full: "999px",
  lg: "8px",
  md: "6px",
  sm: "4px",
  xl: "12px",
  xs: "3px",
  xxl: "20px",
});

export const font = stylex.defineVars({
  family:
    '"Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  size11: "11px",
  size12: "12px",
  size13: "13px",
  size14: "14px",
  size15: "15px",
  size20: "20px",
  size32: "32px",
  weightBold: "700",
  weightMedium: "500",
  weightRegular: "400",
  weightSemibold: "600",
});

export const shadow = stylex.defineVars({
  card: "0 0 0 1px rgba(15, 15, 15, 0.04), 0 1px 2px rgba(15, 15, 15, 0.06)",
  focus: "0 0 0 2px rgba(35, 131, 226, 0.45)",
  popover:
    "0 0 0 1px rgba(15, 15, 15, 0.05), 0 4px 12px rgba(15, 15, 15, 0.1), 0 12px 32px rgba(15, 15, 15, 0.08)",
  window: "0 0 0 1px rgba(0, 0, 0, 0.06), 0 24px 60px rgba(0, 0, 0, 0.08)",
});

export const motion = stylex.defineVars({
  fast: "120ms",
  normal: "180ms",
});
