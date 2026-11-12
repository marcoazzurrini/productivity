import { addDays, toLocalDate } from "@productivity/gtd";
import type { LocalDate } from "@productivity/gtd";
import { Button, IconButton } from "@productivity/ui";
import { color, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect } from "react";

import { useOverview } from "./data.ts";
import { useNavigation } from "./navigation.tsx";

const styles = stylex.create({
  // Darker than other top-bar icons: these are the bar's main controls.
  arrow: {
    color: { ":hover": color.textPrimary, default: color.textSecondary },
  },
  dayNav: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    gap: space.s1,
  },
  // Quieter than a button in the page: it sits in the window's chrome.
  today: { borderColor: color.borderDefault, paddingInline: 10 },
});

/** Today by the store's clock, or by the computer's before that loads. */
const useToday = (): (() => LocalDate) => {
  const storeToday = useOverview().data?.today;

  return useCallback(
    (): LocalDate => storeToday ?? toLocalDate(new Date()),
    [storeToday]
  );
};

/** Opens today's journal page. */
export const useTodaysJournal = (): (() => void) => {
  const { go } = useNavigation();
  const today = useToday();

  return useCallback((): void => {
    go({ day: today(), kind: "journal" });
  }, [go, today]);
};

/**
 * The way into the journal, in every page's top bar. On the journal it
 * moves between days; elsewhere it opens today, yesterday or tomorrow.
 * ⌘J opens today's page from anywhere.
 */
export const DayNav = () => {
  const { view, go } = useNavigation();
  const storeToday = useOverview().data?.today;
  const today = useToday();
  const openToday = useTodaysJournal();

  /** Opens the page this many days from the one shown, or from today. */
  const step = (days: number) => () => {
    const from = view.kind === "journal" ? view.day : today();

    go({ day: addDays(from, days), kind: "journal" });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey && event.key.toLowerCase() === "j") {
        event.preventDefault();
        openToday();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openToday]);

  return (
    <span {...stylex.props(styles.dayNav)}>
      <IconButton
        icon={<ChevronLeft size={16} />}
        label="Previous day"
        onClick={step(-1)}
        xstyle={styles.arrow}
      />
      <Button
        disabled={view.kind === "journal" && view.day === storeToday}
        onClick={openToday}
        size="small"
        title="Today's journal (⌘J)"
        variant="outline"
        xstyle={styles.today}
      >
        Today
      </Button>
      <IconButton
        icon={<ChevronRight size={16} />}
        label="Next day"
        onClick={step(1)}
        xstyle={styles.arrow}
      />
    </span>
  );
};
