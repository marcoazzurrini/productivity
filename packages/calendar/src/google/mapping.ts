import type { StoredCalendar, StoredEvent } from "../repository.ts";
import { addDays, instantOf, isText } from "../time.ts";
import type {
  GoogleCalendarEntry,
  GoogleEvent,
  GoogleEventBody,
} from "./api.ts";

/** Google's default calendar blue, for calendars without a color. */
const googleBlue = "#4285F4";

export const googleCalendarId = (remoteId: string): string =>
  `google:${remoteId}`;

/** Calendars the user shows in Google Calendar, minus free/busy-only ones. */
export const isShown = (entry: GoogleCalendarEntry): boolean =>
  entry.deleted !== true &&
  entry.hidden !== true &&
  entry.selected !== false &&
  entry.accessRole !== "freeBusyReader";

export const calendarFromGoogle = (
  entry: GoogleCalendarEntry,
  position: number,
  existing: StoredCalendar | undefined
): StoredCalendar => ({
  color: entry.backgroundColor ?? googleBlue,
  id: googleCalendarId(entry.id),
  name: entry.summaryOverride ?? entry.summary,
  position,
  primary: entry.primary === true,
  remoteId: entry.id,
  source: "google",
  syncToken: existing?.syncToken ?? null,
  writable: entry.accessRole === "owner" || entry.accessRole === "writer",
});

/** Event types Google lets a calendar app edit like any other event. */
const editableTypes = new Set([
  undefined,
  "default",
  "focusTime",
  "outOfOffice",
]);

/**
 * The stored form of a Google event, or null for things that are not
 * events on the grid, such as working-location markers.
 */
export const eventFromGoogle = (
  item: GoogleEvent,
  calendar: StoredCalendar
): Omit<StoredEvent, "id" | "pending"> | null => {
  if (item.eventType === "workingLocation") {
    return null;
  }

  const startDate = item.start?.date;
  const startTime = item.start?.dateTime;
  let times: Pick<StoredEvent, "allDay" | "start" | "end">;

  if (isText(startDate)) {
    times = {
      allDay: true,
      end: item.end?.date ?? addDays(startDate, 1),
      start: startDate,
    };
  } else if (isText(startTime)) {
    const start = instantOf(startTime);
    const end = item.end?.dateTime;

    times = {
      allDay: false,
      end: isText(end) ? instantOf(end) : start,
      start,
    };
  } else {
    return null;
  }

  // An invitation is someone else's event: only its organizer may move it.
  const ownsIt =
    item.organizer?.self !== false || item.guestsCanModify === true;

  return {
    ...times,
    calendarId: calendar.id,
    editable:
      calendar.writable &&
      ownsIt &&
      item.locked !== true &&
      editableTypes.has(item.eventType),
    etag: item.etag ?? null,
    recurring: item.recurringEventId !== undefined,
    remoteId: item.id,
    title: item.summary ?? "",
  };
};

/**
 * The fields Google should hold for an event. A patch also clears the
 * other kind of time, so an event can switch between timed and all-day.
 */
export const eventToGoogle = (
  event: StoredEvent,
  mode: "insert" | "patch"
): GoogleEventBody => {
  const time = (value: string) => {
    if (mode === "insert") {
      return event.allDay ? { date: value } : { dateTime: value };
    }

    return event.allDay
      ? { date: value, dateTime: null, timeZone: null }
      : { date: null, dateTime: value };
  };

  return {
    end: time(event.end),
    start: time(event.start),
    summary: event.title,
  };
};

/**
 * The ID to create an event with at Google. It comes from the local ID, so
 * sending the same new event twice cannot make two copies.
 */
export const remoteIdFor = (event: StoredEvent): string =>
  event.id.replaceAll("-", "");
