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

export interface Choice {
  value: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  /**
   * One compact control shown inside the selected card, at the end of its
   * row, such as a project picker.
   */
  aside?: ReactNode;
  /** Extra fields shown under the selected card, such as a new project's name. */
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
  aside: { display: "flex", flexShrink: 0 },
  card: {
    alignItems: "stretch",
    backgroundColor: { ":hover": color.bgSidebar, default: color.bgPage },
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    borderStyle: "solid",
    borderWidth: 1,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: space.s3,
    paddingBlock: space.s3,
    paddingInline: 14,
    transitionDuration: motion.fast,
    transitionProperty: "background-color, border-color",
  },
  // The inset shadow thickens the border to 1.5px without moving the text.
  cardSelected: {
    backgroundColor: {
      ":hover": color.accentSubtle,
      default: color.accentSubtle,
    },
    borderColor: color.accent,
    boxShadow: `inset 0 0 0 0.5px ${color.accent}`,
  },
  description: {
    color: color.textTertiary,
    fontSize: font.size12,
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
  // The number key that picks the card. Outlined, so it stays quiet.
  key: {
    alignItems: "center",
    borderColor: color.borderDefault,
    borderRadius: radius.sm,
    borderStyle: "solid",
    borderWidth: 1,
    color: color.textTertiary,
    display: "inline-flex",
    flexShrink: 0,
    fontFamily: font.family,
    fontSize: font.size11,
    fontWeight: font.weightMedium,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  radio: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: color.borderStrong,
    borderRadius: radius.full,
    borderStyle: "solid",
    borderWidth: 1.5,
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    display: "flex",
    flexShrink: 0,
    height: 18,
    justifyContent: "center",
    outline: "none",
    padding: 0,
    width: 18,
  },
  radioSelected: { borderColor: color.accent },
  text: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: 2,
    minWidth: 0,
  },
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
              {selected && choice.aside !== undefined ? (
                <span {...stylex.props(styles.aside)}>{choice.aside}</span>
              ) : null}
              {numberShortcuts && index < 9 ? (
                <kbd {...stylex.props(styles.key)}>{index + 1}</kbd>
              ) : null}
            </span>
            {selected ? choice.detail : null}
          </label>
        );
      })}
    </RadioGroup>
  );
};
