import { Button, Dialog, Kbd, TextField, useToast } from "@productivity/ui";
import { color, font, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { createContext, use, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { useStoreAction } from "./data.ts";
import { useNavigation } from "./navigation.tsx";

const QuickCaptureContext = createContext<(() => void) | null>(null);

const styles = stylex.create({
  hint: {
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    fontFamily: font.family,
    fontSize: font.size12,
    gap: 6,
  },
  hints: { display: "flex", gap: space.s4 },
  spacer: { flexGrow: 1 },
});

const CaptureDialog = ({ onClose }: { onClose: () => void }) => {
  const { go } = useNavigation();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const capture = useStoreAction(
    (store, input: { title: string; notes: string }) => store.capture(input)
  );

  const save = (clarifyNow: boolean): void => {
    if (title.trim() === "") {
      return;
    }

    capture.mutate(
      { notes, title },
      {
        onSuccess: () => {
          if (clarifyNow) {
            go({ kind: "clarify", taskId: null });
          } else {
            toast({ title: "Saved to Inbox" });
          }
        },
      }
    );
    onClose();
  };

  return (
    <Dialog
      footer={
        <>
          <span {...stylex.props(styles.hints)}>
            <span {...stylex.props(styles.hint)}>
              <Kbd>↵</Kbd> Save to Inbox
            </span>
            <span {...stylex.props(styles.hint)}>
              <Kbd>⌘↵</Kbd> Save and clarify now
            </span>
            <span {...stylex.props(styles.hint)}>
              <Kbd>esc</Kbd> Cancel
            </span>
          </span>
          <span {...stylex.props(styles.spacer)} />
          <Button
            disabled={title.trim() === ""}
            onClick={() => {
              save(false);
            }}
            size="small"
            variant="primary"
          >
            Save
          </Button>
        </>
      }
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
      title="Capture"
    >
      <TextField
        appearance="bare"
        autoFocus
        hideLabel
        label="What's on your mind?"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save(event.metaKey);
          }
        }}
        onValueChange={setTitle}
        placeholder="What's on your mind?"
        value={title}
      />
      <TextField
        hideLabel
        label="Notes"
        multiline
        onValueChange={setNotes}
        placeholder="Notes"
        value={notes}
      />
    </Dialog>
  );
};

/** Capture from anywhere: the + button or ⌘N. Everything lands in the Inbox. */
export const QuickCaptureProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <QuickCaptureContext value={show}>
      {children}
      {open ? (
        <CaptureDialog
          onClose={() => {
            setOpen(false);
          }}
        />
      ) : null}
    </QuickCaptureContext>
  );
};

export const useQuickCapture = (): (() => void) => {
  const show = use(QuickCaptureContext);

  if (show === null) {
    throw new Error("useQuickCapture needs a QuickCaptureProvider above it.");
  }

  return show;
};
