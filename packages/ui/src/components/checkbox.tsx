import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import * as stylex from "@stylexjs/stylex";
import { Check } from "lucide-react";

import { color, motion, radius, shadow } from "../tokens.stylex.ts";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Checkboxes in task rows have no visible label, so this names them. */
  label: string;
  disabled?: boolean;
}

const styles = stylex.create({
  box: {
    alignItems: "center",
    backgroundColor: {
      ":hover": color.bgHover,
      default: color.bgPage,
    },
    borderColor: color.borderStrong,
    borderRadius: radius.sm,
    borderStyle: "solid",
    borderWidth: 1.5,
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    height: 16,
    justifyContent: "center",
    outline: "none",
    padding: 0,
    transitionDuration: motion.fast,
    transitionProperty: "background-color, border-color",
    width: 16,
  },
  checked: {
    backgroundColor: { ":hover": color.accentHover, default: color.accent },
    borderColor: color.accent,
  },
  indicator: {
    color: color.textOnAccent,
    display: "flex",
  },
});

export const Checkbox = ({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: CheckboxProps) => (
  <BaseCheckbox.Root
    aria-label={label}
    checked={checked}
    disabled={disabled}
    onCheckedChange={(next) => {
      onCheckedChange(next);
    }}
    {...stylex.props(styles.box, checked && styles.checked)}
  >
    <BaseCheckbox.Indicator {...stylex.props(styles.indicator)}>
      <Check aria-hidden size={12} strokeWidth={3} />
    </BaseCheckbox.Indicator>
  </BaseCheckbox.Root>
);
