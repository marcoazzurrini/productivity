import { invalid, notFound, readOnly } from "./errors.ts";
import { createGoogleApi } from "./google/api.ts";
import { createOAuth, GoogleAuthError } from "./google/oauth.ts";
import type {
  Fetch,
  GoogleClient,
  OAuth,
  SecretStore,
  SignInDevices,
} from "./google/oauth.ts";
import { createGoogleSync } from "./google/sync.ts";
import type { GoogleSync } from "./google/sync.ts";
import type {
  CalendarEvent,
  CalendarInfo,
  EventChanges,
  LocalDate,
  NewEvent,
  SyncStatus,
} from "./model.ts";
import type {
  CalendarRepository,
  StoredCalendar,
  StoredEvent,
} from "./repository.ts";
import {
  isLocalDate,
  isLocalDateTime,
  isText,
  startOfDay,
  toInstant,
  toLocalDateTime,
} from "./time.ts";

/**
 * Everything the app can ask of its calendar. Storage, time zones, Google
 * sign-in and two-way sync stay behind this interface.
 */
export interface Calendar {
  listCalendars: () => CalendarInfo[];
  /** Events that overlap the days [from, to). */
  listEvents: (from: LocalDate, to: LocalDate) => CalendarEvent[];
  createEvent: (event: NewEvent) => CalendarEvent;
  updateEvent: (eventId: string, changes: EventChanges) => CalendarEvent;
  deleteEvent: (eventId: string) => void;

  syncStatus: () => SyncStatus;
  /** Opens Google sign-in in the browser, then syncs. Errors land in the status. */
  connectGoogle: () => Promise<SyncStatus>;
  /** Cancels a sign-in in progress, or signs out and removes Google's events. */
  disconnectGoogle: () => Promise<SyncStatus>;
  sync: () => Promise<SyncStatus>;
}

export interface GoogleOptions extends SignInDevices {
  client: GoogleClient;
  secrets: SecretStore;
  /** Defaults to the global fetch. Tests pass a fake Google. */
  fetch?: Fetch;
}

export interface CalendarOptions {
  repository: CalendarRepository;
  /** Leave out to run without Google, for example with no client ID. */
  google?: GoogleOptions;
  /** Defaults to the system clock. */
  clock?: () => Date;
  /**
   * Sync this long after a local change. Null leaves syncing to whoever
   * calls sync(), as tests do.
   */
  syncDelayMs?: number | null;
}

export interface CalendarService extends Calendar {
  /** Called after a sync changed events or the sync status. */
  subscribe: (listener: () => void) => () => void;
  close: () => void;
}

const localCalendar: StoredCalendar = {
  color: "#0070E0",
  id: "local",
  name: "On this Mac",
  position: 0,
  primary: false,
  remoteId: null,
  source: "local",
  syncToken: null,
  writable: true,
};

const newId = (): string => crypto.randomUUID();

/** True or false, and nothing else. */
/**
 * Checks times that arrive from another process, and converts timed ones
 * to UTC instants for storage.
 */
const storedTimes = (
  allDay: boolean,
  start: string,
  end: string
): Pick<StoredEvent, "allDay" | "start" | "end"> => {
  // The renderer is another process: its values only claim these types.
  if (allDay !== true && allDay !== false) {
    throw invalid("allDay must be true or false.");
  }

  if (allDay) {
    if (!isLocalDate(start) || !isLocalDate(end) || end <= start) {
      throw invalid(
        "An all-day event needs a start day and a later end day (YYYY-MM-DD)."
      );
    }

    return { allDay, end, start };
  }

  if (!isLocalDateTime(start) || !isLocalDateTime(end) || end <= start) {
    throw invalid(
      "A timed event needs a start and a later end (YYYY-MM-DDTHH:mm)."
    );
  }

  return { allDay, end: toInstant(end), start: toInstant(start) };
};

const checkTitle = (title: string): string => {
  if (!isText(title)) {
    throw invalid("An event's title must be text.");
  }

  return title.trim();
};

/** The time as the user sees it: LocalDate or LocalDateTime. */
const shown = (event: StoredEvent, value: string): string =>
  event.allDay ? value : toLocalDateTime(value);

const toPublic = (
  event: StoredEvent,
  calendar: StoredCalendar
): CalendarEvent => ({
  allDay: event.allDay,
  calendarId: event.calendarId,
  color: calendar.color,
  editable: event.editable && calendar.writable,
  end: shown(event, event.end),
  id: event.id,
  recurring: event.recurring,
  start: shown(event, event.start),
  title: event.title,
});

/** Google events wait as pending changes until the next sync sends them. */
const pendingFor = (
  calendar: StoredCalendar,
  change: "create" | "update",
  current: StoredEvent["pending"] = null
): StoredEvent["pending"] =>
  calendar.source === "google" ? (current ?? change) : null;

export const createCalendar = ({
  repository,
  google,
  clock = () => new Date(),
  syncDelayMs = 1500,
}: CalendarOptions): CalendarService => {
  const listeners = new Set<() => void>();

  if (!repository.listCalendars().some((calendar) => calendar.id === "local")) {
    repository.saveCalendar(localCalendar);
  }

  let oauth: OAuth | null = null;
  let engine: GoogleSync | null = null;

  if (google !== undefined) {
    const fetch: Fetch =
      google.fetch ?? ((url, init) => globalThis.fetch(url, init));

    oauth = createOAuth({
      client: google.client,
      clock,
      fetch,
      secrets: google.secrets,
    });
    engine = createGoogleSync({
      api: createGoogleApi({ fetch, session: oauth.session }),
      clock,
      newId,
      repository,
    });
  }

  const calendars = (): StoredCalendar[] =>
    repository.listCalendars().toSorted((a, b) => a.position - b.position);

  const primaryAccount = (): string | null =>
    calendars().find((calendar) => calendar.primary)?.remoteId ?? null;

  let status: SyncStatus;

  if (oauth === null) {
    status = { state: "unavailable" };
  } else if (oauth.isSignedIn()) {
    status = {
      account: primaryAccount(),
      error: null,
      lastSyncedAt: null,
      state: "connected",
      syncing: false,
    };
  } else {
    status = { error: null, state: "disconnected" };
  }

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setStatus = (next: SyncStatus): SyncStatus => {
    status = next;
    notify();

    return status;
  };

  const defaultCalendar = (): StoredCalendar => {
    const all = calendars();

    return (
      all.find((calendar) => calendar.primary && calendar.writable) ??
      all.find((calendar) => calendar.id === "local") ??
      localCalendar
    );
  };

  const findCalendar = (calendarId: string): StoredCalendar => {
    const calendar = calendars().find((each) => each.id === calendarId);

    if (calendar === undefined) {
      throw notFound("calendar", calendarId);
    }

    return calendar;
  };

  /** An event the user can see, or an error. */
  const findEvent = (eventId: string): StoredEvent => {
    const event = repository.findEvent(eventId);

    if (event === undefined || event.pending === "delete") {
      throw notFound("event", eventId);
    }

    return event;
  };

  const editableEvent = (eventId: string): StoredEvent => {
    const event = findEvent(eventId);

    if (!event.editable || !findCalendar(event.calendarId).writable) {
      throw readOnly(`"${event.title}"`);
    }

    return event;
  };

  let running: Promise<SyncStatus> | null = null;
  let syncAgain = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let signIn: AbortController | null = null;

  const runSync = async (): Promise<SyncStatus> => {
    if (engine === null || oauth === null || status.state !== "connected") {
      return status;
    }

    setStatus({ ...status, syncing: true });

    try {
      const account = await engine.run();

      setStatus({
        account,
        error: null,
        lastSyncedAt: clock().toISOString(),
        state: "connected",
        syncing: false,
      });
    } catch (error) {
      if (error instanceof GoogleAuthError && error.signedOut) {
        engine.forget();
        setStatus({ error: error.message, state: "disconnected" });
      } else if (status.state === "connected") {
        setStatus({
          ...status,
          error: error instanceof Error ? error.message : String(error),
          syncing: false,
        });
      }
    }

    return status;
  };

  const sync = (): Promise<SyncStatus> => {
    if (running !== null) {
      // Changes made during this sync go out in one more round after it.
      syncAgain = true;

      return running;
    }

    const round = async (): Promise<SyncStatus> => {
      const result = await runSync();

      running = null;

      if (syncAgain) {
        syncAgain = false;

        return sync();
      }

      return result;
    };

    running = round();

    return running;
  };

  const syncSoon = (): void => {
    if (syncDelayMs === null || status.state !== "connected") {
      return;
    }

    clearTimeout(timer);
    timer = setTimeout(() => {
      void sync();
    }, syncDelayMs);
  };

  return {
    close: () => {
      clearTimeout(timer);
      signIn?.abort();
      listeners.clear();
    },

    connectGoogle: async () => {
      if (
        oauth === null ||
        google === undefined ||
        status.state !== "disconnected"
      ) {
        return status;
      }

      const abort = new AbortController();

      signIn = abort;
      setStatus({ state: "connecting" });

      try {
        await oauth.signIn(google, abort.signal);
      } catch (error) {
        return abort.signal.aborted
          ? status
          : setStatus({
              error: error instanceof Error ? error.message : String(error),
              state: "disconnected",
            });
      } finally {
        signIn = null;
      }

      setStatus({
        account: null,
        error: null,
        lastSyncedAt: null,
        state: "connected",
        syncing: false,
      });

      return sync();
    },

    createEvent: (input) => {
      const calendar =
        input.calendarId === undefined
          ? defaultCalendar()
          : findCalendar(input.calendarId);

      if (!calendar.writable) {
        throw readOnly(`The calendar "${calendar.name}"`);
      }

      const event: StoredEvent = {
        ...storedTimes(input.allDay, input.start, input.end),
        calendarId: calendar.id,
        editable: true,
        etag: null,
        id: newId(),
        pending: pendingFor(calendar, "create"),
        recurring: false,
        remoteId: null,
        title: checkTitle(input.title),
      };

      repository.saveEvent(event);
      syncSoon();

      return toPublic(event, calendar);
    },

    deleteEvent: (eventId) => {
      const event = editableEvent(eventId);

      if (event.remoteId === null) {
        repository.deleteEvent(eventId);
      } else {
        repository.saveEvent({ ...event, pending: "delete" });
        syncSoon();
      }
    },

    disconnectGoogle: async () => {
      if (oauth === null || engine === null) {
        return status;
      }

      if (signIn !== null) {
        signIn.abort();

        return setStatus({ error: null, state: "disconnected" });
      }

      await running;
      await oauth.signOut();
      engine.forget();

      return setStatus({ error: null, state: "disconnected" });
    },

    listCalendars: () => {
      const fallback = defaultCalendar();

      return calendars().map((calendar) => ({
        color: calendar.color,
        id: calendar.id,
        isDefault: calendar.id === fallback.id,
        name: calendar.name,
        source: calendar.source,
        writable: calendar.writable,
      }));
    },

    listEvents: (from, to) => {
      if (!isLocalDate(from) || !isLocalDate(to) || to <= from) {
        throw invalid("Events are listed for days [from, to).");
      }

      const byId = new Map(
        calendars().map((calendar) => [calendar.id, calendar])
      );

      return repository
        .eventsIn({
          fromDate: from,
          fromInstant: startOfDay(from),
          toDate: to,
          toInstant: startOfDay(to),
        })
        .flatMap((event) => {
          const calendar = byId.get(event.calendarId);

          return event.pending === "delete" || calendar === undefined
            ? []
            : [toPublic(event, calendar)];
        });
    },

    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    sync,

    syncStatus: () => status,

    updateEvent: (eventId, changes) => {
      const event = editableEvent(eventId);
      const calendar = findCalendar(event.calendarId);
      const allDay = changes.allDay ?? event.allDay;

      if (
        allDay !== event.allDay &&
        (changes.start === undefined || changes.end === undefined)
      ) {
        throw invalid(
          "Switching between timed and all-day needs a new start and end."
        );
      }

      const updated: StoredEvent = {
        ...event,
        ...storedTimes(
          allDay,
          changes.start ?? shown(event, event.start),
          changes.end ?? shown(event, event.end)
        ),
        pending: pendingFor(calendar, "update", event.pending),
        title:
          changes.title === undefined ? event.title : checkTitle(changes.title),
      };

      repository.saveEvent(updated);
      syncSoon();

      return toPublic(updated, calendar);
    },
  };
};
