import { Menu as BaseMenu } from "@base-ui/react/menu";
import * as stylex from "@stylexjs/stylex";
import { Check } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import { color, font, radius, shadow, space } from "../tokens.stylex.ts";

export interface MenuAction {
  /** Tells apart two actions with the same label. Defaults to the label. */
  id?: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Shows a tick, for the current choice in a list of choices. */
  checked?: boolean;
  /** A keyboard shortcut shown at the end, such as "⌘N". */
  shortcut?: string;
}

export interface MenuProps {
  /** The button that opens the menu, such as an IconButton. */
  trigger: ReactElement;
  /** Actions in order. "separator" draws a line between groups. */
  items: readonly (MenuAction | "separator")[];
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
}

const styles = stylex.create({
  check: { color: color.accent, display: "flex" },
  icon: { color: color.textTertiary, display: "flex" },
  item: {
    alignItems: "center",
    backgroundColor: {
      ":is([data-highlighted])": color.bgHover,
      default: "transparent",
    },
    borderRadius: radius.sm,
    color: {
      ":is([data-disabled])": color.textPlaceholder,
      default: color.textPrimary,
    },
    cursor: "default",
    display: "flex",
    fontSize: font.size13,
    gap: space.s2,
    minWidth: 180,
    outline: "none",
    paddingBlock: 6,
    paddingInline: space.s2,
  },
  label: { flexGrow: 1 },
  popup: {
    backgroundColor: color.bgCard,
    borderRadius: radius.lg,
    boxShadow: shadow.popover,
    fontFamily: font.family,
    outline: "none",
    padding: space.s1,
  },
  separator: {
    backgroundColor: color.borderDefault,
    height: 1,
    marginBlock: space.s1,
  },
  shortcut: { color: color.textTertiary, fontSize: font.size12 },
});

/** A short list of actions that opens from a button, such as a "…" button. */
export const Menu = ({
  trigger,
  items,
  side = "bottom",
  align = "end",
}: MenuProps) => (
  <BaseMenu.Root>
    <BaseMenu.Trigger render={trigger} />
    <BaseMenu.Portal>
      <BaseMenu.Positioner align={align} side={side} sideOffset={4}>
        <BaseMenu.Popup {...stylex.props(styles.popup)}>
          {items.map((item, index) =>
            item === "separator" ? (
              <BaseMenu.Separator
                // A separator has no identity besides its place.
                // oxlint-disable-next-line react/no-array-index-key
                key={`separator-${index}`}
                {...stylex.props(styles.separator)}
              />
            ) : (
              <BaseMenu.Item
                disabled={item.disabled}
                key={item.id ?? item.label}
                onClick={() => {
                  item.onSelect();
                }}
                {...stylex.props(styles.item)}
              >
                {item.icon === undefined ? null : (
                  <span aria-hidden {...stylex.props(styles.icon)}>
                    {item.icon}
                  </span>
                )}
                <span {...stylex.props(styles.label)}>{item.label}</span>
                {item.checked === true ? (
                  <span {...stylex.props(styles.check)}>
                    <Check aria-label="Selected" size={14} />
                  </span>
                ) : null}
                {item.shortcut === undefined ? null : (
                  <span {...stylex.props(styles.shortcut)}>
                    {item.shortcut}
                  </span>
                )}
              </BaseMenu.Item>
            )
          )}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  </BaseMenu.Root>
);
