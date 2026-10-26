import type { Calendar } from "./calendar.ts";

export type CalendarMethod = keyof Calendar;

/**
 * Every Calendar method by name. Process boundaries (Electron IPC) use this
 * list to refuse anything that is not part of the interface.
 */
export const calendarMethods = [
  "listCalendars",
  "listEvents",
  "createEvent",
  "updateEvent",
  "deleteEvent",
  "syncStatus",
  "connectGoogle",
  "disconnectGoogle",
  "sync",
] as const satisfies readonly CalendarMethod[];

// Fails to compile if a method is added to Calendar but not to the list.
type MissingMethod = Exclude<CalendarMethod, (typeof calendarMethods)[number]>;

const everyMethodListed: [MissingMethod] extends [never] ? true : never = true;

export const isCalendarMethod = (name: string): name is CalendarMethod =>
  everyMethodListed && calendarMethods.some((method) => method === name);

/** The calendar seen from another process: every call is asynchronous. */
export type RemoteCalendar = {
  [Method in CalendarMethod]: (
    ...args: Parameters<Calendar[Method]>
  ) => Promise<Awaited<ReturnType<Calendar[Method]>>>;
};

/** Sends one calendar call across a process boundary. */
export type CalendarTransport = <Method extends CalendarMethod>(
  method: Method,
  args: Parameters<Calendar[Method]>
) => Promise<Awaited<ReturnType<Calendar[Method]>>>;

/**
 * A Calendar living in another process, reached through `transport`. Every
 * method is listed so the compiler checks each signature end to end.
 */
export const createRemoteCalendar = (
  transport: CalendarTransport
): RemoteCalendar => ({
  connectGoogle: (...args) => transport("connectGoogle", args),
  createEvent: (...args) => transport("createEvent", args),
  deleteEvent: (...args) => transport("deleteEvent", args),
  disconnectGoogle: (...args) => transport("disconnectGoogle", args),
  listCalendars: (...args) => transport("listCalendars", args),
  listEvents: (...args) => transport("listEvents", args),
  sync: (...args) => transport("sync", args),
  syncStatus: (...args) => transport("syncStatus", args),
  updateEvent: (...args) => transport("updateEvent", args),
});
