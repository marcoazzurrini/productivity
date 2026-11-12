import { Popover as BasePopover } from "@base-ui/react/popover";
import * as stylex from "@stylexjs/stylex";
import type { ReactElement, ReactNode } from "react";

import { color, font, radius, shadow, space } from "../tokens.stylex.ts";

export interface PopoverProps {
  /** The button that opens the popover. */
  trigger: ReactElement;
  /** Names the popover for screen readers. */
  label: string;
  children: ReactNode;
  /** Controls the popover from outside, to close it after a choice. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
}

const styles = stylex.create({
  popup: {
    backgroundColor: color.bgCard,
    borderRadius: radius.lg,
    boxShadow: shadow.popover,
    color: color.textPrimary,
    fontFamily: font.family,
    fontSize: font.size13,
    outline: "none",
    padding: space.s3,
  },
});

/** A small panel that opens from a button, for one field or a few choices. */
export const Popover = ({
  trigger,
  label,
  children,
  open,
  onOpenChange,
  side = "bottom",
  align = "start",
}: PopoverProps) => (
  <BasePopover.Root onOpenChange={onOpenChange} open={open}>
    <BasePopover.Trigger render={trigger} />
    <BasePopover.Portal>
      <BasePopover.Positioner align={align} side={side} sideOffset={6}>
        <BasePopover.Popup aria-label={label} {...stylex.props(styles.popup)}>
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  </BasePopover.Root>
);
