import { createContext, use } from "react";
import type { ReactNode } from "react";

import type { JournalBridge } from "../../shared/journal.ts";

const JournalContext = createContext<JournalBridge | null>(null);

/** Provides the journal. Tests pass one backed by an in-memory database. */
export const JournalProvider = ({
  journal,
  children,
}: {
  journal: JournalBridge;
  children: ReactNode;
}) => <JournalContext value={journal}>{children}</JournalContext>;

export const useJournal = (): JournalBridge => {
  const journal = use(JournalContext);

  if (journal === null) {
    throw new Error("useJournal needs a JournalProvider above it.");
  }

  return journal;
};
