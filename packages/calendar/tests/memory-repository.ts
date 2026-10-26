import type {
  CalendarRepository,
  StoredCalendar,
  StoredEvent,
} from "../src/index.ts";

/** The repository contract in memory. `@productivity/db` has the real one. */
export const memoryRepository = (): CalendarRepository & {
  events: Map<string, StoredEvent>;
} => {
  const calendars = new Map<string, StoredCalendar>();
  const events = new Map<string, StoredEvent>();

  return {
    clearSyncedEvents: (calendarId) => {
      for (const event of events.values()) {
        if (event.calendarId === calendarId && event.pending === null) {
          events.delete(event.id);
        }
      }
    },
    deleteCalendar: (calendarId) => {
      calendars.delete(calendarId);

      for (const event of events.values()) {
        if (event.calendarId === calendarId) {
          events.delete(event.id);
        }
      }
    },
    deleteEvent: (eventId) => {
      events.delete(eventId);
    },
    events,
    eventsIn: (window) =>
      [...events.values()]
        .filter((event) =>
          event.allDay
            ? event.start < window.toDate && event.end > window.fromDate
            : event.start < window.toInstant && event.end > window.fromInstant
        )
        .toSorted((a, b) => a.start.localeCompare(b.start)),
    findEvent: (eventId) => events.get(eventId),
    findRemoteEvent: (calendarId, remoteId) =>
      [...events.values()].find(
        (event) =>
          event.calendarId === calendarId && event.remoteId === remoteId
      ),
    listCalendars: () => [...calendars.values()].map((each) => ({ ...each })),
    pendingEvents: () =>
      [...events.values()].filter((event) => event.pending !== null),
    saveCalendar: (calendar) => {
      calendars.set(calendar.id, { ...calendar });
    },
    saveEvent: (event) => {
      events.set(event.id, { ...event });
    },
    transaction: (work) => work(),
  };
};
