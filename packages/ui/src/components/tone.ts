import * as stylex from "@stylexjs/stylex";

import { color, tag } from "../tokens.stylex.ts";

/** The colors a tag, avatar or calendar item can take. */
export type Tone =
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "accent";

/** Soft background with a matching foreground, for each tone. */
export const toneStyles = stylex.create({
  accent: { backgroundColor: color.accentSubtle, color: color.textLink },
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

/** Foreground only, for dots and icons. */
export const toneInk = stylex.create({
  accent: { color: color.accent },
  blue: { color: tag.blueFg },
  brown: { color: tag.brownFg },
  gray: { color: tag.grayFg },
  green: { color: tag.greenFg },
  orange: { color: tag.orangeFg },
  pink: { color: tag.pinkFg },
  purple: { color: tag.purpleFg },
  red: { color: tag.redFg },
  yellow: { color: tag.yellowFg },
});
