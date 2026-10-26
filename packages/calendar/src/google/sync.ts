import type {
  CalendarRepository,
  StoredCalendar,
  StoredEvent,
} from "../repository.ts";
import { GoogleApiError } from "./api.ts";
import type { GoogleApi, GoogleEvent } from "./api.ts";
import {
  calendarFromGoogle,
  eventFromGoogle,
  eventToGoogle,
  isShown,
  remoteIdFor,
} from "./mapping.ts";

/** How far back the first sync reaches. */
const historyDays = 365;

/** Google refused the change itself; retrying cannot help. */
const isRefusal = (error: unknown): error is GoogleApiError =>
  error instanceof GoogleApiError &&
  error.status >= 400 &&
  error.status < 500 &&
  error.status !== 429;

const sameContent = (a: StoredEvent, b: StoredEvent): boolean =>
  a.title === b.title &&
  a.allDay === b.allDay &&
  a.start === b.start &&
  a.end === b.end;

export interface GoogleSync {
  /**
   * Sends local changes to Google, then brings in Google's changes.
   * Returns the account's email address.
   */
  run: () => Promise<string | null>;
  /** Removes every Google calendar and its events from this device. */
  forget: () => void;
}

/**
 * Two-way sync with Google Calendar. Local changes wait in the repository
 * as pending until Google accepts them. When both sides changed an event,
 * Google's version wins: the patch carries the etag Google last sent, and
 * Google refuses it if the event has changed since.
 */
export const createGoogleSync = ({
  api,
  repository,
  clock,
  newId,
}: {
  api: GoogleApi;
  repository: CalendarRepository;
  clock: () => Date;
  newId: () => string;
}): GoogleSync => {
  const googleCalendars = (): StoredCalendar[] =>
    repository
      .listCalendars()
      .filter((calendar) => calendar.source === "google");

  const refreshCalendars = async (): Promise<string | null> => {
    const all = await api.listCalendars();
    const entries = all.filter(isShown);

    const known = new Map(
      googleCalendars().map((calendar) => [calendar.remoteId, calendar])
    );

    repository.transaction(() => {
      for (const [index, entry] of entries.entries()) {
        repository.saveCalendar(
          calendarFromGoogle(entry, index + 1, known.get(entry.id))
        );
        known.delete(entry.id);
      }

      // Calendars the user removed or hid in Google go away here too.
      for (const gone of known.values()) {
        repository.deleteCalendar(gone.id);
      }
    });

    return entries.find((entry) => entry.primary === true)?.id ?? null;
  };

  /** Stores Google's copy of an event over the local one. */
  const store = (
    calendar: StoredCalendar,
    item: GoogleEvent,
    localId: string
  ): void => {
    const fields = eventFromGoogle(item, calendar);

    if (fields === null || item.status === "cancelled") {
      repository.deleteEvent(localId);
    } else {
      repository.saveEvent({ ...fields, id: localId, pending: null });
    }
  };

  /** Google accepted `sent`; record its reply unless the user changed it since. */
  const accepted = (
    calendar: StoredCalendar,
    sent: StoredEvent,
    reply: GoogleEvent
  ): void => {
    const current = repository.findEvent(sent.id);

    if (current === undefined) {
      return;
    }

    if (current.pending === "delete" || !sameContent(current, sent)) {
      repository.saveEvent({
        ...current,
        etag: reply.etag ?? null,
        pending: current.pending === "delete" ? "delete" : "update",
        remoteId: reply.id,
      });
    } else {
      store(calendar, reply, sent.id);
    }
  };

  /** Google refused a change: show Google's version again. */
  const restore = async (
    calendar: StoredCalendar,
    calendarRemoteId: string,
    event: StoredEvent & { remoteId: string }
  ): Promise<void> => {
    try {
      store(
        calendar,
        await api.getEvent(calendarRemoteId, event.remoteId),
        event.id
      );
    } catch (error) {
      if (!isRefusal(error)) {
        throw error;
      }

      repository.deleteEvent(event.id);
    }
  };

  const pushOne = async (
    calendar: StoredCalendar,
    calendarRemoteId: string,
    event: StoredEvent
  ): Promise<void> => {
    if (event.pending === "delete") {
      if (event.remoteId !== null) {
        await api.deleteEvent(calendarRemoteId, event.remoteId);
      }

      repository.deleteEvent(event.id);

      return;
    }

    if (event.remoteId !== null) {
      accepted(
        calendar,
        event,
        await api.patchEvent(
          calendarRemoteId,
          event.remoteId,
          eventToGoogle(event, "patch"),
          event.etag
        )
      );

      return;
    }

    const remoteId = remoteIdFor(event);

    try {
      accepted(
        calendar,
        event,
        await api.insertEvent(calendarRemoteId, {
          ...eventToGoogle(event, "insert"),
          id: remoteId,
        })
      );
    } catch (error) {
      // 409: an earlier attempt reached Google before the app heard back.
      if (!(error instanceof GoogleApiError && error.status === 409)) {
        throw error;
      }

      accepted(calendar, event, await api.getEvent(calendarRemoteId, remoteId));
    }
  };

  const push = async (): Promise<void> => {
    const calendars = new Map(
      googleCalendars().map((calendar) => [calendar.id, calendar])
    );

    for (const event of repository.pendingEvents()) {
      const calendar = calendars.get(event.calendarId);

      if (calendar === undefined || calendar.remoteId === null) {
        continue;
      }

      try {
        // One change at a time, in order, to stay well inside Google's rate limits.
        // oxlint-disable-next-line no-await-in-loop
        await pushOne(calendar, calendar.remoteId, event);
      } catch (error) {
        // Offline or a server error: keep the change and try next time.
        if (!isRefusal(error)) {
          throw error;
        }

        if (event.remoteId === null) {
          repository.deleteEvent(event.id);
        } else {
          // oxlint-disable-next-line no-await-in-loop -- as above.
          await restore(calendar, calendar.remoteId, {
            ...event,
            remoteId: event.remoteId,
          });
        }
      }
    }
  };

  const fullSyncStart = (): string => {
    const start = clock();

    start.setDate(start.getDate() - historyDays);

    return start.toISOString();
  };

  const pull = async (calendar: StoredCalendar): Promise<void> => {
    const remoteId = calendar.remoteId ?? "";
    let result: Awaited<ReturnType<GoogleApi["listEvents"]>>;

    try {
      result = await api.listEvents(
        remoteId,
        calendar.syncToken === null
          ? { timeMin: fullSyncStart() }
          : { syncToken: calendar.syncToken }
      );
    } catch (error) {
      // 410: Google no longer accepts the sync token.
      if (!(error instanceof GoogleApiError && error.status === 410)) {
        throw error;
      }

      repository.clearSyncedEvents(calendar.id);
      result = await api.listEvents(remoteId, { timeMin: fullSyncStart() });
    }

    repository.transaction(() => {
      for (const item of result.items) {
        const existing = repository.findRemoteEvent(calendar.id, item.id);

        if (existing === undefined) {
          if (item.status !== "cancelled") {
            store(calendar, item, newId());
          }
        } else if (existing.pending === null || item.status === "cancelled") {
          // A local change waiting to be sent wins, unless Google deleted
          // the event: then there is nothing left to change.
          store(calendar, item, existing.id);
        }
      }

      repository.saveCalendar({ ...calendar, syncToken: result.syncToken });
    });
  };

  return {
    forget: () => {
      repository.transaction(() => {
        for (const calendar of googleCalendars()) {
          repository.deleteCalendar(calendar.id);
        }
      });
    },

    run: async () => {
      const account = await refreshCalendars();

      await push();

      // Calendars are independent, and each one's writes are one transaction.
      await Promise.all(googleCalendars().map(pull));

      return account;
    },
  };
};
