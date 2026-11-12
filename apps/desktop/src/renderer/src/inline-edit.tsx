import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";

const styles = stylex.create({
  control: {
    backgroundColor: "transparent",
    borderStyle: "none",
    color: "inherit",
    font: "inherit",
    letterSpacing: "inherit",
    margin: 0,
    outline: "none",
    padding: 0,
    resize: "none",
    width: "100%",
  },
  // A text area as tall as its text, so editing does not move the page.
  multiline: { fieldSizing: "content" },
});

/** Typing replaces the old text, and an arrow key keeps it. */
const selectAll = (
  event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>
): void => {
  event.currentTarget.select();
};

export interface InlineEditProps {
  /** Names the field for screen readers. */
  label: string;
  initialValue: string;
  /** Several lines: Enter adds a line, and ⌘Enter saves. */
  multiline?: boolean;
  /** Called once with the trimmed text, on Enter or when focus leaves. */
  onSave: (value: string) => void;
  /** Called on Escape. */
  onCancel: () => void;
}

/**
 * Text edited where it is shown, such as a heading's title. It takes its
 * look from the element around it, starts with everything selected, and
 * saves when the user moves on.
 */
export const InlineEdit = ({
  label,
  initialValue,
  multiline = false,
  onSave,
  onCancel,
}: InlineEditProps) => {
  const [value, setValue] = useState(initialValue);
  // Enter saves and then focus leaves: only the first of the two counts.
  const settled = useRef(false);

  const save = (): void => {
    if (!settled.current) {
      settled.current = true;
      onSave(value.trim());
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      settled.current = true;
      onCancel();
    } else if (event.key === "Enter" && (!multiline || event.metaKey)) {
      event.preventDefault();
      save();
    }
  };

  return multiline ? (
    <textarea
      aria-label={label}
      // oxlint-disable-next-line jsx-a11y/no-autofocus -- the user just asked to edit this text.
      autoFocus
      onBlur={save}
      onChange={(event) => {
        setValue(event.target.value);
      }}
      onFocus={selectAll}
      onKeyDown={onKeyDown}
      rows={1}
      value={value}
      {...stylex.props(styles.control, styles.multiline)}
    />
  ) : (
    <input
      aria-label={label}
      // oxlint-disable-next-line jsx-a11y/no-autofocus -- the user just asked to edit this text.
      autoFocus
      onBlur={save}
      onChange={(event) => {
        setValue(event.target.value);
      }}
      onFocus={selectAll}
      onKeyDown={onKeyDown}
      type="text"
      value={value}
      {...stylex.props(styles.control)}
    />
  );
};
