import type { LocalDate } from "@productivity/gtd";
import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useSelection } from "./selection.tsx";

/** Every place the center pane can show. */
export type View =
  | { kind: "inbox" }
  | { kind: "clarify"; taskId: string | null }
  | { kind: "next"; contextId: string | null }
  | { kind: "upcoming" }
  | { kind: "waiting" }
  | { kind: "someday" }
  | { kind: "project"; projectId: string }
  | { kind: "review" }
  | { kind: "journal"; day: LocalDate };

interface Navigation {
  view: View;
  go: (view: View) => void;
}

const NavigationContext = createContext<Navigation | null>(null);

export const NavigationProvider = ({
  initial,
  children,
}: {
  initial?: View;
  children: ReactNode;
}) => {
  const [view, setView] = useState<View>(initial ?? { kind: "inbox" });
  const { select } = useSelection();

  // A selected to-do belongs to the list it was picked in, so leaving the
  // list drops it. Whoever wants one selected on arrival selects after go.
  const go = useCallback(
    (next: View) => {
      select(null);
      setView(next);
    },
    [select]
  );

  const value = useMemo(() => ({ go, view }), [go, view]);

  return <NavigationContext value={value}>{children}</NavigationContext>;
};

export const useNavigation = (): Navigation => {
  const navigation = use(NavigationContext);

  if (navigation === null) {
    throw new Error("useNavigation needs a NavigationProvider above it.");
  }

  return navigation;
};
