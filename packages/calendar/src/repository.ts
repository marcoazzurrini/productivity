import type { CalendarSource, LocalDate } from "./model.ts";

/** A calendar as stored. Google calendars carry their sync position. */
export interface StoredCalendar {
  id: string;
  source: CalendarSource;
  /** Google's calendar ID. Null for the local calendar. */
  remoteId: string | null;
  name: string;
  color: string;
  writable: boolean;
  /** The Google account's main calendar. */
  primary: boolean;
  /** Google's token for asking only what changed since the last sync. */
  syncToken: string | null;
  position: number;
}

/** A local change that Google has not seen yet. */
export type PendingChange = "create" | "update" | "delete";

export interface StoredEvent {
  id: string;
  calendarId: string;
  /** Google's event ID, once Google knows the event. */
  remoteId: string | null;
  /** Google's version of the event, sent back to detect conflicts. */
  etag: string | null;
  title: string;
  allDay: boolean;
  /** Timed events: a UTC instant from toISOString(). All-day: a LocalDate. */
  start: string;
  /** Exclusive, in the same format as start. */
  end: string;
  editable: boolean;
  recurring: boolean;
  pending: PendingChange | null;
}

/** The days [fromDate, toDate), and the same span as UTC instants. */
export interface EventWindow {
  fromDate: LocalDate;
  toDate: LocalDate;
  fromInstant: string;
  toInstant: string;
}

/**
 * Where the calendar keeps its data. The calendar module decides what to
 * store; the repository only stores it. `@productivity/db` implements it.
 */
export interface CalendarRepository {
  /** Runs `work` so that all of its writes land, or none do. */
  transaction: <Result>(work: () => Result) => Result;

  listCalendars: () => StoredCalendar[];
  saveCalendar: (calendar: StoredCalendar) => void;
  /** Removes the calendar and every event on it. */
  deleteCalendar: (calendarId: string) => void;

  /** Events that overlap the window, including ones pending deletion. */
  eventsIn: (window: EventWindow) => StoredEvent[];
  findEvent: (eventId: string) => StoredEvent | undefined;
  findRemoteEvent: (
    calendarId: string,
    remoteId: string
  ) => StoredEvent | undefined;
  pendingEvents: () => StoredEvent[];
  saveEvent: (event: StoredEvent) => void;
  deleteEvent: (eventId: string) => void;
  /** Removes a calendar's events, except those with a pending change. */
  clearSyncedEvents: (calendarId: string) => void;
}
