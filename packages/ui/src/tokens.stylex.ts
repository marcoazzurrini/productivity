import * as stylex from "@stylexjs/stylex";

/**
 * Design tokens from the "Foundations" page of the penna design in .penna/.
 * Text colors are darkened from the design where needed so every pairing
 * meets WCAG AA contrast (4.5:1), in both themes.
 * StyleX turns each group into CSS custom properties. Colors and shadows
 * take their dark values when the system, or the app's Theme setting,
 * asks for a dark color scheme.
 */

const dark = "@media (prefers-color-scheme: dark)";

/** A token's light value and its dark value. */
const themed = (light: string, darkValue: string) => ({
  [dark]: darkValue,
  default: light,
});

export const color = stylex.defineVars({
  accent: themed("#0070E0", "#1F6FD6"),
  accentHover: themed("#0064C8", "#2C7BE0"),
  accentPressed: themed("#0058B0", "#1A62C0"),
  accentSubtle: themed("#E9F3FE", "#1B2A3D"),
  accentSubtleHover: themed("#DCEBFD", "#21344B"),
  bgCard: themed("#FFFFFF", "#252525"),
  bgHover: themed("#F1F1EF", "#2B2B2A"),
  bgPage: themed("#FFFFFF", "#191919"),
  bgPressed: themed("#E9E9E7", "#353534"),
  /** A selected segment, raised above its track. */
  bgRaised: themed("#FFFFFF", "#454543"),
  bgSidebar: themed("#F8F8F7", "#202020"),
  bgToday: themed("#F5F9FF", "#1C2128"),
  borderDefault: themed("#E9E9E7", "#2F2F2E"),
  borderFocus: themed("#2383E2", "#3D8FF0"),
  borderStrong: themed("#D3D3D0", "#434341"),
  /** Drawn icons at rest, such as a project's progress pie. */
  iconMuted: themed("#A5A5A2", "#6E6E6B"),
  /** Toasts: dark on a light page, light on a dark one. */
  inverse: themed("#191918", "#EBEBEA"),
  inverseHover: themed("rgba(255, 255, 255, 0.08)", "rgba(0, 0, 0, 0.06)"),
  nowLine: themed("#E03E3E", "#EC5A54"),
  overlay: themed("rgba(15, 15, 15, 0.35)", "rgba(0, 0, 0, 0.55)"),
  star: themed("#E2B203", "#E8C33A"),
  successOnInverse: themed("#4DAB9A", "#17776C"),
  textLink: themed("#0B6BCB", "#5AA8FF"),
  textLinkOnInverse: themed("#7EB7F5", "#0B62BB"),
  textOnAccent: "#FFFFFF",
  textOnInverse: themed("#FFFFFF", "#191918"),
  textPlaceholder: themed("#B9B9B6", "#5C5C59"),
  textPrimary: themed("#191918", "#EBEBEA"),
  textSecondary: themed("#5F5E5B", "#ABABA8"),
  textTertiary: themed("#6C6C6A", "#999996"),
});

/** Notion's tag palette: a soft background and a readable foreground for each hue. */
export const tag = stylex.defineVars({
  blueBg: themed("#E7F3F8", "#1E2F3D"),
  blueFg: themed("#2E7299", "#6AAFDA"),
  brownBg: themed("#F4EEEE", "#3A2D27"),
  brownFg: themed("#8F604A", "#C9997F"),
  grayBg: themed("#F1F1EF", "#2F2F2E"),
  grayFg: themed("#6D6C69", "#A3A3A0"),
  greenBg: themed("#EDF3EC", "#22332A"),
  greenFg: themed("#3E7859", "#72B98F"),
  orangeBg: themed("#FBECDD", "#3D2B1C"),
  orangeFg: themed("#A25609", "#E79A55"),
  pinkBg: themed("#F9EEF3", "#3A2531"),
  pinkFg: themed("#B1457E", "#DE80B1"),
  purpleBg: themed("#F4F0F7", "#2F2839"),
  purpleFg: themed("#845CA1", "#B497D4"),
  redBg: themed("#FDEBEC", "#3D2324"),
  redFg: themed("#BA423E", "#EF837D"),
  yellowBg: themed("#FBF3DB", "#3A3322"),
  yellowFg: themed("#906621", "#DAB45A"),
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
  size10: "10px",
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
  /** Under a filled accent button. */
  accent: themed(
    "0 1px 2px rgba(5, 130, 255, 0.25)",
    "0 1px 2px rgba(0, 0, 0, 0.4)"
  ),
  card: themed(
    "0 0 0 1px rgba(15, 15, 15, 0.04), 0 1px 2px rgba(15, 15, 15, 0.06)",
    "0 0 0 1px rgba(255, 255, 255, 0.06), 0 1px 2px rgba(0, 0, 0, 0.4)"
  ),
  focus: themed(
    "0 0 0 2px rgba(35, 131, 226, 0.45)",
    "0 0 0 2px rgba(61, 143, 240, 0.6)"
  ),
  popover: themed(
    "0 0 0 1px rgba(15, 15, 15, 0.05), 0 4px 12px rgba(15, 15, 15, 0.1), 0 12px 32px rgba(15, 15, 15, 0.08)",
    "0 0 0 1px rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.35), 0 12px 32px rgba(0, 0, 0, 0.45)"
  ),
  /** A selected segment. */
  raised: themed(
    "0 1px 2px rgba(15, 15, 15, 0.1)",
    "0 1px 2px rgba(0, 0, 0, 0.4)"
  ),
  toast: themed(
    "0 8px 24px rgba(15, 15, 15, 0.2)",
    "0 8px 24px rgba(0, 0, 0, 0.5)"
  ),
  window: themed(
    "0 0 0 1px rgba(0, 0, 0, 0.06), 0 24px 60px rgba(0, 0, 0, 0.08)",
    "0 0 0 1px rgba(255, 255, 255, 0.08), 0 24px 60px rgba(0, 0, 0, 0.5)"
  ),
});

export const motion = stylex.defineVars({
  fast: "120ms",
  normal: "180ms",
});
