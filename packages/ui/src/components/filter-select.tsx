import { Select } from "@base-ui/react/select";
import * as stylex from "@stylexjs/stylex";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { color, font, radius, shadow, space } from "../tokens.stylex.ts";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  /** What is being filtered, shown before the value: "Context", "Time". */
  label: string;
  icon?: ReactNode;
  value: string;
  options: readonly FilterOption[];
  onValueChange: (value: string) => void;
}

const styles = stylex.create({
  check: { color: color.accent, display: "flex", marginInlineStart: "auto" },
  item: {
    alignItems: "center",
    backgroundColor: {
      ":hover": color.bgHover,
      default: "transparent",
    },
    borderRadius: radius.sm,
    color: color.textPrimary,
    cursor: "default",
    display: "flex",
    fontSize: font.size13,
    gap: space.s2,
    minWidth: 160,
    outline: "none",
    paddingBlock: 6,
    paddingInline: space.s2,
  },
  itemHighlighted: {
    backgroundColor: color.bgHover,
  },
  label: { color: color.textTertiary },
  popup: {
    backgroundColor: color.bgCard,
    borderRadius: radius.lg,
    boxShadow: shadow.popover,
    fontFamily: font.family,
    outline: "none",
    padding: space.s1,
  },
  trigger: {
    alignItems: "center",
    backgroundColor: { ":hover": color.bgHover, default: color.bgPage },
    borderColor: color.borderDefault,
    borderRadius: radius.md,
    borderStyle: "solid",
    borderWidth: 1,
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    color: color.textPrimary,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: font.family,
    fontSize: font.size13,
    fontWeight: font.weightMedium,
    gap: 6,
    height: 28,
    outline: "none",
    paddingInline: space.s2,
  },
  triggerIcon: { color: color.textTertiary, display: "flex" },
});

/** A compact dropdown for narrowing a list, such as Next Actions by context. */
export const FilterSelect = ({
  label,
  icon,
  value,
  options,
  onValueChange,
}: FilterSelectProps) => (
  <Select.Root
    items={options}
    onValueChange={(next) => {
      if (next !== null) {
        onValueChange(next);
      }
    }}
    value={value}
  >
    <Select.Trigger aria-label={label} {...stylex.props(styles.trigger)}>
      {icon === undefined ? null : (
        <span aria-hidden {...stylex.props(styles.triggerIcon)}>
          {icon}
        </span>
      )}
      <span {...stylex.props(styles.label)}>{label}</span>
      <Select.Value />
      <Select.Icon {...stylex.props(styles.triggerIcon)}>
        <ChevronDown aria-hidden size={14} />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner alignItemWithTrigger={false} sideOffset={4}>
        <Select.Popup {...stylex.props(styles.popup)}>
          <Select.List>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                {...stylex.props(styles.item)}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator {...stylex.props(styles.check)}>
                  <Check aria-hidden size={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>
);
