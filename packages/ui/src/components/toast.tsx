import { Toast } from "@base-ui/react/toast";
import * as stylex from "@stylexjs/stylex";
import { CircleCheck } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { color, font, radius, space } from "../tokens.stylex.ts";

const styles = stylex.create({
  action: {
    backgroundColor: {
      ":hover": "rgba(255, 255, 255, 0.08)",
      default: "transparent",
    },
    borderRadius: radius.md,
    borderStyle: "none",
    color: "#7EB7F5",
    cursor: "pointer",
    fontFamily: font.family,
    fontSize: font.size13,
    fontWeight: font.weightSemibold,
    height: 30,
    paddingInline: 10,
  },
  icon: { color: "#4DAB9A", display: "flex", flexShrink: 0 },
  root: {
    alignItems: "center",
    backgroundColor: color.inverse,
    borderRadius: radius.lg,
    boxShadow: "0 8px 24px rgba(15, 15, 15, 0.2)",
    color: color.textOnInverse,
    display: "flex",
    fontFamily: font.family,
    gap: space.s3,
    minHeight: 48,
    paddingInlineEnd: space.s2,
    paddingInlineStart: 14,
  },
  title: {
    flexGrow: 1,
    fontSize: font.size13,
    margin: 0,
  },
  viewport: {
    bottom: 76,
    display: "flex",
    flexDirection: "column",
    gap: space.s2,
    left: "50%",
    position: "fixed",
    transform: "translateX(-50%)",
    width: 600,
  },
});

const ToastList = () => {
  const { toasts } = Toast.useToastManager();

  return toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast} {...stylex.props(styles.root)}>
      <span aria-hidden {...stylex.props(styles.icon)}>
        <CircleCheck size={16} />
      </span>
      <Toast.Title {...stylex.props(styles.title)} />
      {toast.actionProps === undefined ? null : (
        <Toast.Action {...stylex.props(styles.action)} />
      )}
    </Toast.Root>
  ));
};

/** Wrap the app once. Toasts announce results politely to screen readers. */
export const ToastProvider = ({ children }: { children: ReactNode }) => (
  <Toast.Provider timeout={6000}>
    {children}
    <Toast.Portal>
      <Toast.Viewport {...stylex.props(styles.viewport)}>
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  </Toast.Provider>
);

export interface ToastMessage {
  title: string;
  /** An optional single action, usually "Undo". */
  action?: { label: string; onAction: () => void };
}

/** Shows a short confirmation at the bottom of the window. */
export const useToast = (): ((message: ToastMessage) => void) => {
  const manager = Toast.useToastManager();

  return useCallback(
    (message: ToastMessage) => {
      manager.add({
        actionProps:
          message.action === undefined
            ? undefined
            : {
                children: message.action.label,
                onClick: message.action.onAction,
              },
        title: message.title,
      });
    },
    [manager]
  );
};
