import * as stylex from "@stylexjs/stylex";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";

import {
  color,
  font,
  radius,
  shadow,
  space,
  tag,
} from "../../tokens.stylex.ts";
import { Button } from "../button.tsx";
import { Kbd } from "../kbd.tsx";
import type { InlineEditState } from "./inline-edit.ts";

const spin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  error: { color: tag.redFg, flexGrow: 1, fontSize: font.size12 },
  footer: {
    alignItems: "center",
    borderTopColor: color.borderDefault,
    borderTopStyle: "solid",
    borderTopWidth: 1,
    display: "flex",
    gap: space.s2,
    paddingBlock: 6,
    paddingInline: space.s3,
  },
  hint: {
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    flexGrow: 1,
    fontSize: font.size12,
    gap: 6,
  },
  icon: { color: color.accent, flexShrink: 0 },
  input: {
    "::placeholder": { color: color.textPlaceholder },
    backgroundColor: "transparent",
    borderStyle: "none",
    color: color.textPrimary,
    flexGrow: 1,
    fontFamily: font.family,
    fontSize: font.size15,
    minWidth: 0,
    outline: "none",
    padding: 0,
  },
  prompt: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    paddingBlock: 10,
    paddingInline: space.s3,
  },
  root: {
    backgroundColor: color.bgCard,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    borderStyle: "solid",
    borderWidth: 1,
    boxShadow: shadow.popover,
    fontFamily: font.family,
    position: "absolute",
    zIndex: 5,
  },
  spinner: {
    animationDuration: "0.9s",
    animationIterationCount: "infinite",
    animationName: spin,
    animationTimingFunction: "linear",
  },
});

const placeholders: Record<InlineEditState["phase"], string> = {
  previewing: "Ask for changes, or press Enter to accept",
  prompt: "Turn these into checkboxes, tidy the wording…",
  working: "Writing…",
};

/** Where the box sits, relative to the editor. */
export interface PromptPosition {
  top: number;
  left: number;
  width: number;
}

export interface InlinePromptProps {
  phase: InlineEditState["phase"];
  error: string | null;
  position: PromptPosition;
  onSubmit: (instruction: string) => void;
  onAccept: () => void;
  onDiscard: () => void;
}

/**
 * The box under a ⌘K edit: type what to change, then accept or discard the
 * new text, which shows in place above it. Typing again asks for more.
 */
export const InlinePrompt = ({
  phase,
  error,
  position,
  onSubmit,
  onAccept,
  onDiscard,
}: InlinePromptProps) => {
  const [text, setText] = useState("");
  const previewing = phase === "previewing";
  const working = phase === "working";

  return (
    <section
      aria-label="Edit with AI"
      style={{ left: position.left, top: position.top, width: position.width }}
      {...stylex.props(styles.root)}
    >
      <div {...stylex.props(styles.prompt)}>
        {working ? (
          <LoaderCircle
            aria-hidden
            size={16}
            {...stylex.props(styles.icon, styles.spinner)}
          />
        ) : (
          <Sparkles aria-hidden size={16} {...stylex.props(styles.icon)} />
        )}
        <input
          aria-label={
            previewing ? "Ask for more changes" : "What should change?"
          }
          // The box opens on purpose, from ⌘K, to be typed in.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          disabled={working}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onDiscard();

              return;
            }

            if (event.key !== "Enter" || event.nativeEvent.isComposing) {
              return;
            }

            event.preventDefault();

            if (previewing && (text.trim() === "" || event.metaKey)) {
              onAccept();
            } else if (text.trim() !== "") {
              onSubmit(text.trim());
              setText("");
            }
          }}
          placeholder={placeholders[phase]}
          value={text}
          {...stylex.props(styles.input)}
        />
      </div>
      <div {...stylex.props(styles.footer)}>
        {error === null ? (
          <span {...stylex.props(styles.hint)}>
            {previewing ? (
              <>
                <Kbd>⏎</Kbd> accept · <Kbd>Esc</Kbd> discard
              </>
            ) : (
              <>
                <Kbd>⏎</Kbd> ask · <Kbd>Esc</Kbd> close
              </>
            )}
          </span>
        ) : (
          <span role="alert" {...stylex.props(styles.error)}>
            {error}
          </span>
        )}
        {previewing ? (
          <>
            <Button onClick={onDiscard} size="small" variant="ghost">
              Discard
            </Button>
            <Button onClick={onAccept} size="small" variant="primary">
              Accept
            </Button>
          </>
        ) : null}
      </div>
    </section>
  );
};
