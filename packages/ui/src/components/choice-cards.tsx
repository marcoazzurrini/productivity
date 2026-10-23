import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import * as stylex from "@stylexjs/stylex";
import { useEffect } from "react";
import type { ReactNode } from "react";

import {
  color,
  font,
  motion,
  radius,
  shadow,
  space,
} from "../tokens.stylex.ts";
import { Kbd } from "./kbd.tsx";

export interface Choice {
  value: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Extra controls shown under the selected card, such as a project picker. */
  detail?: ReactNode;
}

export interface ChoiceCardsProps {
  /** The question being answered. Names the group for screen readers. */
  label: string;
  choices: readonly Choice[];
  value: string | null;
  onValueChange: (value: string) => void;
  /** Number keys 1–9 pick a choice, unless the user is typing in a field. */
  numberShortcuts?: boolean;
}

const styles = stylex.create({
  card: {
    alignItems: "flex-start",
    backgroundColor: { ":hover": color.bgSidebar, default: color.bgPage },
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    borderStyle: "solid",
    borderWidth: 1,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: space.s2,
    padding: space.s3,
    transitionDuration: motion.fast,
    transitionProperty: "background-color, border-color",
  },
  cardSelected: {
    backgroundColor: {
      ":hover": color.accentSubtle,
      default: color.accentSubtle,
    },
    borderColor: color.accent,
  },
  description: {
    color: color.textSecondary,
    fontSize: font.size13,
    margin: 0,
  },
  dot: {
    backgroundColor: color.accent,
    borderRadius: radius.full,
    height: 8,
    width: 8,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    gap: space.s2,
  },
  head: {
    alignItems: "center",
    display: "flex",
    gap: space.s3,
    width: "100%",
  },
  icon: { color: color.textSecondary, display: "flex" },
  radio: {
    alignItems: "center",
    backgroundColor: color.bgPage,
    borderColor: color.borderStrong,
    borderRadius: radius.full,
    borderStyle: "solid",
    borderWidth: 1.5,
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    display: "flex",
    flexShrink: 0,
    height: 16,
    justifyContent: "center",
    outline: "none",
    padding: 0,
    width: 16,
  },
  radioSelected: { borderColor: color.accent },
  text: { display: "flex", flexDirection: "column", flexGrow: 1, gap: 2 },
  title: {
    color: color.textPrimary,
    fontSize: font.size14,
    fontWeight: font.weightMedium,
  },
});

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLElement && target.isContentEditable);

/** One answer from a few, each explained. Used for the Clarify questions. */
export const ChoiceCards = ({
  label,
  choices,
  value,
  onValueChange,
  numberShortcuts = false,
}: ChoiceCardsProps) => {
  useEffect(() => {
    if (!numberShortcuts) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTyping(event.target)
      ) {
        return;
      }

      const choice = choices[Number(event.key) - 1];

      if (choice !== undefined) {
        event.preventDefault();
        onValueChange(choice.value);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [choices, numberShortcuts, onValueChange]);

  return (
    <RadioGroup
      aria-label={label}
      onValueChange={(next) => {
        onValueChange(String(next));
      }}
      value={value}
      {...stylex.props(styles.group)}
    >
      {choices.map((choice, index) => {
        const selected = choice.value === value;

        return (
          // The label makes the whole card a click target for its radio.
          // oxlint-disable-next-line jsx-a11y/label-has-associated-control
          <label
            key={choice.value}
            {...stylex.props(styles.card, selected && styles.cardSelected)}
          >
            <span {...stylex.props(styles.head)}>
              <Radio.Root
                value={choice.value}
                {...stylex.props(
                  styles.radio,
                  selected && styles.radioSelected
                )}
              >
                <Radio.Indicator {...stylex.props(styles.dot)} />
              </Radio.Root>
              {choice.icon === undefined ? null : (
                <span aria-hidden {...stylex.props(styles.icon)}>
                  {choice.icon}
                </span>
              )}
              <span {...stylex.props(styles.text)}>
                <span {...stylex.props(styles.title)}>{choice.title}</span>
                {choice.description === undefined ? null : (
                  <span {...stylex.props(styles.description)}>
                    {choice.description}
                  </span>
                )}
              </span>
              {numberShortcuts && index < 9 ? <Kbd>{index + 1}</Kbd> : null}
            </span>
            {selected ? choice.detail : null}
          </label>
        );
      })}
    </RadioGroup>
  );
};
