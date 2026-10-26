/** A calendar day, written as `YYYY-MM-DD`. */
export type LocalDate = string;

/** A wall-clock time in the user's time zone, written as `YYYY-MM-DDTHH:mm`. */
export type LocalDateTime = string;

export type CalendarSource = "local" | "google";

export interface CalendarInfo {
  id: string;
  name: string;
  source: CalendarSource;
  /** A CSS hex color, such as "#0070E0". */
  color: string;
  /** False for calendars the user may only read, such as public holidays. */
  writable: boolean;
  /** Where new events go unless the user picks another calendar. */
  isDefault: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  /** The color of the event's calendar. */
  color: string;
  allDay: boolean;
  /** A LocalDateTime, or for all-day events the LocalDate of the first day. */
  start: string;
  /**
   * Exclusive. A LocalDateTime, or for all-day events the LocalDate of the
   * day after the last one.
   */
  end: string;
  /** False on read-only calendars and on invitations from other people. */
  editable: boolean;
  /** One occurrence of a repeating event. Changes apply to it alone. */
  recurring: boolean;
}

export interface NewEvent {
  /** Defaults to the default calendar. */
  calendarId?: string;
  title: string;
  allDay: boolean;
  start: string;
  end: string;
}

/**
 * Fields to change on an event. Switching between timed and all-day needs
 * a new start and end in the matching format.
 */
export interface EventChanges {
  title?: string;
  allDay?: boolean;
  start?: string;
  end?: string;
}

export type SyncStatus =
  /** The app was built without a Google client ID. */
  | { state: "unavailable" }
  | { state: "disconnected"; error: string | null }
  /** Waiting for the user to sign in to Google in the browser. */
  | { state: "connecting" }
  | {
      state: "connected";
      /** The Google account's email address. */
      account: string | null;
      syncing: boolean;
      /** When the last sync finished, as an ISO 8601 instant. */
      lastSyncedAt: string | null;
      error: string | null;
    };
