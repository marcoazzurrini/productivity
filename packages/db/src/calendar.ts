import type {
  CalendarRepository,
  StoredCalendar,
  StoredEvent,
} from "@productivity/calendar";
import { and, asc, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import type { NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";

import { calendarEvents, calendars } from "./schema.ts";

const toEvent = (row: typeof calendarEvents.$inferSelect): StoredEvent => row;

const toCalendar = (row: typeof calendars.$inferSelect): StoredCalendar => row;

/** The calendar's storage, in the same database as the GTD data. */
export const createCalendarRepository = (
  db: NodeSQLiteDatabase
): CalendarRepository => ({
  clearSyncedEvents: (calendarId) => {
    db.delete(calendarEvents)
      .where(
        and(
          eq(calendarEvents.calendarId, calendarId),
          isNull(calendarEvents.pending)
        )
      )
      .run();
  },

  deleteCalendar: (calendarId) => {
    // Events go with it: the foreign key cascades.
    db.delete(calendars).where(eq(calendars.id, calendarId)).run();
  },

  deleteEvent: (eventId) => {
    db.delete(calendarEvents).where(eq(calendarEvents.id, eventId)).run();
  },

  eventsIn: (window) =>
    db
      .select()
      .from(calendarEvents)
      .where(
        or(
          and(
            eq(calendarEvents.allDay, true),
            lt(calendarEvents.start, window.toDate),
            gt(calendarEvents.end, window.fromDate)
          ),
          and(
            eq(calendarEvents.allDay, false),
            lt(calendarEvents.start, window.toInstant),
            gt(calendarEvents.end, window.fromInstant)
          )
        )
      )
      .orderBy(asc(calendarEvents.start))
      .all()
      .map(toEvent),

  findEvent: (eventId) => {
    const row = db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .get();

    return row === undefined ? undefined : toEvent(row);
  },

  findRemoteEvent: (calendarId, remoteId) => {
    const row = db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.calendarId, calendarId),
          eq(calendarEvents.remoteId, remoteId)
        )
      )
      .get();

    return row === undefined ? undefined : toEvent(row);
  },

  listCalendars: () =>
    db
      .select()
      .from(calendars)
      .orderBy(asc(calendars.position))
      .all()
      .map(toCalendar),

  pendingEvents: () =>
    db
      .select()
      .from(calendarEvents)
      .where(isNotNull(calendarEvents.pending))
      .all()
      .map(toEvent),

  saveCalendar: (calendar) => {
    db.insert(calendars)
      .values(calendar)
      .onConflictDoUpdate({ set: calendar, target: calendars.id })
      .run();
  },

  saveEvent: (event) => {
    db.insert(calendarEvents)
      .values(event)
      .onConflictDoUpdate({ set: event, target: calendarEvents.id })
      .run();
  },

  transaction: (work) => {
    let result: ReturnType<typeof work> | undefined;

    db.transaction(() => {
      result = work();
    });

    // SAFETY: the transaction ran `work` to completion, or threw.
    return result as ReturnType<typeof work>;
  },
});
