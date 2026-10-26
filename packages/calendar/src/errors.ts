/** Why the calendar refused a request. */
export type CalendarErrorReason = "not-found" | "read-only" | "invalid";

/** The calendar refused a request; `reason` says why. */
export class CalendarError extends Error {
  readonly reason: CalendarErrorReason;

  constructor(reason: CalendarErrorReason, message: string) {
    super(message);
    this.name = "CalendarError";
    this.reason = reason;
  }
}

export const notFound = (kind: "event" | "calendar", id: string) =>
  new CalendarError("not-found", `No ${kind} with id "${id}".`);

export const readOnly = (what: string) =>
  new CalendarError("read-only", `${what} is read-only.`);

export const invalid = (message: string) =>
  new CalendarError("invalid", message);
