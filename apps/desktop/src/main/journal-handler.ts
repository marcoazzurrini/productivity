import type { LocalDate } from "@productivity/gtd";

export class InvalidJournalCallError extends TypeError {
  constructor(operation: string, expected: string) {
    super(`A journal ${operation} needs ${expected}.`);
    this.name = "InvalidJournalCallError";
  }
}

/** True only for strings: anything else differs from its own string form. */
const isText = (value: unknown): value is string => String(value) === value;

type Check<Call extends unknown[]> = (args: unknown[]) => asserts args is Call;

/**
 * Journal calls arrive from the renderer untyped, so their arguments are
 * checked here, at the IPC boundary. The store then checks that the day is
 * a real date.
 */
export const checkRead: Check<[day: LocalDate]> = (args) => {
  if (args.length !== 1 || !isText(args[0])) {
    throw new InvalidJournalCallError("read", "a day");
  }
};

export const checkWrite: Check<[day: LocalDate, markdown: string]> = (args) => {
  if (args.length !== 2 || !isText(args[0]) || !isText(args[1])) {
    throw new InvalidJournalCallError("write", "a day and the page as text");
  }
};
