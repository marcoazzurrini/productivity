import type { CalendarTransport } from "@productivity/calendar";

/** The IPC channels for the calendar. */
export const calendarChannel = {
  call: "calendar:call",
  /** Main to renderer: a sync changed events or the sync status. */
  changed: "calendar:changed",
} as const;

/** What the preload script gives the renderer for the calendar. */
export interface CalendarBridge {
  call: CalendarTransport;
  /** Calls `listener` after each change from a sync. Returns an unsubscribe. */
  onChanged: (listener: () => void) => () => void;
}
