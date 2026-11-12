import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface WeekPane {
  /** Whether the week is shown on the right of the window. */
  shown: boolean;
  toggle: () => void;
}

const WeekPaneContext = createContext<WeekPane | null>(null);

const storageKey = "productivity.week-pane";

/** The saved choice. Storage can be blocked or empty: then the week shows. */
const readShown = (): boolean => {
  try {
    return localStorage.getItem(storageKey) !== "hidden";
  } catch {
    return true;
  }
};

const saveShown = (shown: boolean): void => {
  try {
    localStorage.setItem(storageKey, shown ? "shown" : "hidden");
  } catch {
    // The choice still holds until the window closes.
  }
};

/** Remembers whether the week pane is open, between visits too. */
export const WeekPaneProvider = ({ children }: { children: ReactNode }) => {
  const [shown, setShown] = useState(readShown);

  const toggle = useCallback(() => {
    saveShown(!shown);
    setShown(!shown);
  }, [shown]);

  const value = useMemo(() => ({ shown, toggle }), [shown, toggle]);

  return <WeekPaneContext value={value}>{children}</WeekPaneContext>;
};

export const useWeekPane = (): WeekPane => {
  const pane = use(WeekPaneContext);

  if (pane === null) {
    throw new Error("useWeekPane needs a WeekPaneProvider above it.");
  }

  return pane;
};
