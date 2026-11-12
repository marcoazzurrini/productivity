import { createContext, use, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface Selection {
  /** The to-do the toolbar's When and Move act on, if any. */
  selectedId: string | null;
  select: (taskId: string | null) => void;
}

const SelectionContext = createContext<Selection | null>(null);

/** One selected to-do for the whole window. Click a row to select it. */
export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const value = useMemo(
    () => ({ select: setSelectedId, selectedId }),
    [selectedId]
  );

  return <SelectionContext value={value}>{children}</SelectionContext>;
};

export const useSelection = (): Selection => {
  const selection = use(SelectionContext);

  if (selection === null) {
    throw new Error("useSelection needs a SelectionProvider above it.");
  }

  return selection;
};
