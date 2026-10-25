import { parseLocalDate, toLocalDate } from "@productivity/gtd";
import type { LocalDate, LocalDateTime } from "@productivity/gtd";
import { eq } from "drizzle-orm";
import type { NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";

import { journalPages } from "./schema.ts";

/** One day's journal entry, written in Markdown. */
export interface JournalPage {
  day: LocalDate;
  /** Exactly what the user typed. Empty for a day with nothing written. */
  markdown: string;
  /** When the page was last saved, or null if it never was. */
  updatedAt: LocalDateTime | null;
}

/** A journal with one page per day. */
export interface JournalStore {
  /** The page for a day. A day with nothing written reads as an empty page. */
  read: (day: LocalDate) => JournalPage;
  /** Replaces a day's page. Writing only whitespace removes the page. */
  write: (day: LocalDate, markdown: string) => JournalPage;
}

export class InvalidDayError extends RangeError {
  constructor(day: string) {
    super(`"${day}" is not a day. Expected YYYY-MM-DD.`);
    this.name = "InvalidDayError";
  }
}

const dayPattern = /^\d{4}-\d{2}-\d{2}$/u;

/**
 * Days arrive from another process, so check them: they must name a real
 * date, such as "2026-10-24" but not "2026-02-30".
 */
const checkDay = (day: LocalDate): LocalDate => {
  if (!dayPattern.test(day) || toLocalDate(parseLocalDate(day)) !== day) {
    throw new InvalidDayError(day);
  }

  return day;
};

const emptyPage = (day: LocalDate): JournalPage => ({
  day,
  markdown: "",
  updatedAt: null,
});

export const createJournal = (
  db: NodeSQLiteDatabase,
  now: () => LocalDateTime
): JournalStore => ({
  read: (input) => {
    const day = checkDay(input);

    return (
      db.select().from(journalPages).where(eq(journalPages.day, day)).get() ??
      emptyPage(day)
    );
  },

  write: (input, markdown) => {
    const day = checkDay(input);

    if (markdown.trim().length === 0) {
      db.delete(journalPages).where(eq(journalPages.day, day)).run();

      return emptyPage(day);
    }

    const updatedAt = now();

    db.insert(journalPages)
      .values({ day, markdown, updatedAt })
      .onConflictDoUpdate({
        set: { markdown, updatedAt },
        target: journalPages.day,
      })
      .run();

    return { day, markdown, updatedAt };
  },
});
