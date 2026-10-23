import { Field } from "@base-ui/react/field";
import * as stylex from "@stylexjs/stylex";
import type { KeyboardEvent } from "react";

import { color, font, radius, shadow, space } from "../tokens.stylex.ts";

export interface TextFieldProps {
  label: string;
  /** Keep the label for screen readers but do not show it. */
  hideLabel?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  type?: "text" | "date" | "number";
  /** "bare" has no border, for the main field of a dialog. */
  appearance?: "boxed" | "bare";
  multiline?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

const styles = stylex.create({
  bare: {
    backgroundColor: "transparent",
    borderStyle: "none",
    fontSize: 17,
    fontWeight: font.weightMedium,
    padding: 0,
  },
  boxed: {
    backgroundColor: color.bgPage,
    borderColor: { ":focus": color.borderFocus, default: color.borderStrong },
    borderRadius: radius.md,
    borderStyle: "solid",
    borderWidth: 1,
    boxShadow: { ":focus": shadow.focus, default: null },
    fontSize: font.size14,
    paddingBlock: 7,
    paddingInline: 10,
  },
  control: {
    "::placeholder": { color: color.textPlaceholder },
    color: color.textPrimary,
    fontFamily: font.family,
    outline: "none",
    resize: "none",
    width: "100%",
  },
  description: {
    color: color.textTertiary,
    fontSize: font.size12,
    margin: 0,
  },
  hidden: {
    clip: "rect(0 0 0 0)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    whiteSpace: "nowrap",
    width: 1,
  },
  label: {
    color: color.textSecondary,
    fontSize: font.size13,
    fontWeight: font.weightMedium,
  },
  multiline: { lineHeight: "20px", minHeight: 60 },
  root: {
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    gap: space.s1,
  },
});

export const TextField = ({
  label,
  hideLabel = false,
  value,
  onValueChange,
  placeholder,
  description,
  type = "text",
  appearance = "boxed",
  multiline = false,
  autoFocus = false,
  onKeyDown,
}: TextFieldProps) => {
  const controlStyle = stylex.props(
    styles.control,
    appearance === "boxed" ? styles.boxed : styles.bare,
    multiline && styles.multiline
  );

  return (
    <Field.Root {...stylex.props(styles.root)}>
      <Field.Label {...stylex.props(hideLabel ? styles.hidden : styles.label)}>
        {label}
      </Field.Label>
      {multiline ? (
        <Field.Control
          onValueChange={(next) => {
            onValueChange(String(next));
          }}
          render={
            <textarea
              // oxlint-disable-next-line jsx-a11y/no-autofocus -- the field is the reason the dialog opened.
              autoFocus={autoFocus}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              {...controlStyle}
            />
          }
          value={value}
        />
      ) : (
        <Field.Control
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- the field is the reason the dialog opened.
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          onValueChange={(next) => {
            onValueChange(String(next));
          }}
          placeholder={placeholder}
          type={type}
          value={value}
          {...controlStyle}
        />
      )}
      {description === undefined ? null : (
        <Field.Description {...stylex.props(styles.description)}>
          {description}
        </Field.Description>
      )}
    </Field.Root>
  );
};
