import { SegmentedControl } from "@productivity/ui";
import { color, font, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Monitor, Moon, Sun, SunMoon } from "lucide-react";

import { isTheme } from "../../shared/appearance.ts";
import { useTheme } from "./appearance-context.tsx";

const styles = stylex.create({
  icon: { display: "flex", flexShrink: 0 },
  label: { flexGrow: 1 },
  row: {
    alignItems: "center",
    color: color.textSecondary,
    display: "flex",
    fontFamily: font.family,
    fontSize: font.size14,
    gap: 10,
    height: 30,
    paddingInlineEnd: space.s1,
    paddingInlineStart: 10,
  },
});

const options = [
  { icon: <Monitor size={14} />, label: "Match the system", value: "system" },
  { icon: <Sun size={14} />, label: "Light", value: "light" },
  { icon: <Moon size={14} />, label: "Dark", value: "dark" },
];

/** Light, dark, or whatever macOS shows. Sits in the sidebar's footer. */
export const ThemeSetting = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div {...stylex.props(styles.row)}>
      <span aria-hidden {...stylex.props(styles.icon)}>
        <SunMoon size={16} />
      </span>
      <span {...stylex.props(styles.label)}>Theme</span>
      <SegmentedControl
        label="Theme"
        onValueChange={(next) => {
          if (isTheme(next)) {
            setTheme(next);
          }
        }}
        options={options}
        size="small"
        value={theme}
      />
    </div>
  );
};
