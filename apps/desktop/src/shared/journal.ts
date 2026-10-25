import type { JournalPage } from "@productivity/db";
import type { LocalDate } from "@productivity/gtd";

export type { JournalPage } from "@productivity/db";

/** The IPC channels for the journal, one per operation. */
export const journalChannel = {
  read: "journal:read",
  write: "journal:write",
  writeNow: "journal:write-now",
} as const;

/** What the preload script gives the renderer for the journal. */
export interface JournalBridge {
  read: (day: LocalDate) => Promise<JournalPage>;
  write: (day: LocalDate, markdown: string) => Promise<JournalPage>;
  /**
   * Saves while the window is closing, when an asynchronous call could be
   * cut off. Blocks until the page is on disk; use it for nothing else.
   */
  writeNow: (day: LocalDate, markdown: string) => void;
}
