import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, radius, shadow } from "../tokens.stylex.ts";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names the dialog for screen readers. Shown only when `showTitle` is set. */
  title: string;
  showTitle?: boolean;
  width?: number;
  children: ReactNode;
  /** A strip at the bottom for keyboard hints and buttons. */
  footer?: ReactNode;
}

const styles = stylex.create({
  backdrop: {
    backgroundColor: color.overlay,
    inset: 0,
    position: "fixed",
  },
  body: { padding: 16 },
  footer: {
    alignItems: "center",
    borderTopColor: color.borderDefault,
    borderTopStyle: "solid",
    borderTopWidth: 1,
    display: "flex",
    gap: 12,
    paddingBlock: 10,
    paddingInline: 16,
  },
  hiddenTitle: {
    clip: "rect(0 0 0 0)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    whiteSpace: "nowrap",
    width: 1,
  },
  popup: {
    backgroundColor: color.bgCard,
    borderRadius: radius.xl,
    boxShadow: shadow.popover,
    fontFamily: font.family,
    left: "50%",
    maxWidth: "calc(100vw - 48px)",
    outline: "none",
    position: "fixed",
    top: "22%",
    transform: "translateX(-50%)",
  },
  title: {
    color: color.textPrimary,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
    margin: 0,
    paddingInline: 16,
    paddingTop: 16,
  },
});

export const Dialog = ({
  open,
  onOpenChange,
  title,
  showTitle = false,
  width = 640,
  children,
  footer,
}: DialogProps) => (
  <BaseDialog.Root
    onOpenChange={(next) => {
      onOpenChange(next);
    }}
    open={open}
  >
    <BaseDialog.Portal>
      <BaseDialog.Backdrop {...stylex.props(styles.backdrop)} />
      <BaseDialog.Popup {...stylex.props(styles.popup)} style={{ width }}>
        <BaseDialog.Title
          {...stylex.props(showTitle ? styles.title : styles.hiddenTitle)}
        >
          {title}
        </BaseDialog.Title>
        <div {...stylex.props(styles.body)}>{children}</div>
        {footer === undefined ? null : (
          <div {...stylex.props(styles.footer)}>{footer}</div>
        )}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>
);
