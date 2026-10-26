import { addDays, toLocalDate } from "@productivity/gtd";
import type { LocalDate } from "@productivity/gtd";
import { Button, IconButton } from "@productivity/ui";
import { space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect } from "react";

import { useOverview } from "./data.ts";
import { useNavigation } from "./navigation.tsx";

const styles = stylex.create({
  dayNav: {
    alignItems: "center",
    display: "flex",
    gap: space.s1,
    marginInlineStart: "auto",
  },
});

/**
 * The way into the journal, in every page's top bar. On the journal it
 * moves between days; elsewhere it opens today, yesterday or tomorrow.
 * ⌘J opens today's page from anywhere.
 */
export const DayNav = () => {
  const { view, go } = useNavigation();
  const storeToday = useOverview().data?.today;

  // Today by the store's clock, or by the computer's before that loads.
  const today = useCallback(
    (): LocalDate => storeToday ?? toLocalDate(new Date()),
    [storeToday]
  );

  /** Opens the page this many days from the one shown, or from today. */
  const step = (days: number) => () => {
    const from = view.kind === "journal" ? view.day : today();

    go({ day: addDays(from, days), kind: "journal" });
  };

  const openToday = useCallback((): void => {
    go({ day: today(), kind: "journal" });
  }, [go, today]);

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
        icon={<ChevronLeft size={18} />}
        label="Previous day"
        onClick={step(-1)}
      />
      <Button
        disabled={view.kind === "journal" && view.day === storeToday}
        onClick={openToday}
        size="small"
        title="Today's journal (⌘J)"
        variant="outline"
      >
        Today
      </Button>
      <IconButton
        icon={<ChevronRight size={18} />}
        label="Next day"
        onClick={step(1)}
      />
    </span>
  );
};
