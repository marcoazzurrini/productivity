import { Toast } from "@base-ui/react/toast";
import * as stylex from "@stylexjs/stylex";
import { CircleCheck } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { color, font, radius, shadow, space } from "../tokens.stylex.ts";

const styles = stylex.create({
  action: {
    backgroundColor: {
      ":hover": color.inverseHover,
      default: "transparent",
    },
    borderRadius: radius.md,
    borderStyle: "none",
    color: color.textLinkOnInverse,
    cursor: "pointer",
    fontFamily: font.family,
    fontSize: font.size13,
    fontWeight: font.weightSemibold,
    height: 30,
    paddingInline: 10,
  },
  icon: { color: color.successOnInverse, display: "flex", flexShrink: 0 },
  root: {
    alignItems: "center",
    backgroundColor: color.inverse,
    borderRadius: radius.lg,
    boxShadow: shadow.toast,
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
    // The title is a heading to screen readers, but reads as a sentence.
    fontWeight: font.weightRegular,
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
  // Inside the main pane: centered over the list, clear of the toolbar.
  viewportInMain: {
    maxWidth: "calc(100% - 32px)",
    position: "absolute",
    zIndex: 1,
  },
});

/**
 * The toasts, placed in the page's main pane when it has one: a toast
 * reports on the list beside it, so it sits under that list rather than in
 * the middle of the window. The pane must be a positioned element.
 */
const ToastLayer = () => {
  const { toasts } = Toast.useToastManager();
  const main = toasts.length === 0 ? null : document.querySelector("main");

  return (
    <Toast.Portal container={main ?? undefined}>
      <Toast.Viewport
        {...stylex.props(
          styles.viewport,
          main !== null && styles.viewportInMain
        )}
      >
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            {...stylex.props(styles.root)}
          >
            <span aria-hidden {...stylex.props(styles.icon)}>
              <CircleCheck size={16} />
            </span>
            <Toast.Title {...stylex.props(styles.title)} />
            {toast.actionProps === undefined ? null : (
              <Toast.Action {...stylex.props(styles.action)} />
            )}
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
};

/** Wrap the app once. Toasts announce results politely to screen readers. */
export const ToastProvider = ({ children }: { children: ReactNode }) => (
  <Toast.Provider timeout={6000}>
    {children}
    <ToastLayer />
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
