import type { Fetch, Session } from "./oauth.ts";

/**
 * The few Google Calendar API v3 calls the sync needs, over plain fetch.
 * https://developers.google.com/workspace/calendar/api/v3/reference
 */

const apiRoot = "https://www.googleapis.com/calendar/v3";

/** The most events Google returns on one page. */
const pageSize = "2500";

export interface GoogleCalendarEntry {
  id: string;
  summary: string;
  summaryOverride?: string;
  backgroundColor?: string;
  accessRole: "freeBusyReader" | "reader" | "writer" | "owner";
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
  deleted?: boolean;
}

export interface GoogleTime {
  date?: string | null;
  dateTime?: string | null;
  timeZone?: string | null;
}

export interface GoogleEvent {
  id: string;
  etag?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  start?: GoogleTime;
  end?: GoogleTime;
  recurringEventId?: string;
  organizer?: { self?: boolean };
  guestsCanModify?: boolean;
  locked?: boolean;
  eventType?: string;
}

export type GoogleEventBody = Pick<GoogleEvent, "summary" | "start" | "end"> & {
  /** Chosen by the client on insert, so a retried insert cannot duplicate. */
  id?: string;
};

export class GoogleApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
  }
}

interface Page<Item> {
  items?: Item[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export interface GoogleApi {
  listCalendars: () => Promise<GoogleCalendarEntry[]>;
  /**
   * Every page of events: the changes since `syncToken`, or with no token
   * everything that ends after `timeMin`. Repeating events come expanded.
   * Fails with status 410 when Google no longer accepts the sync token.
   */
  listEvents: (
    calendarId: string,
    from: { syncToken: string } | { timeMin: string }
  ) => Promise<{ items: GoogleEvent[]; syncToken: string | null }>;
  getEvent: (calendarId: string, eventId: string) => Promise<GoogleEvent>;
  insertEvent: (
    calendarId: string,
    body: GoogleEventBody
  ) => Promise<GoogleEvent>;
  /** Fails with status 412 if the event changed at Google since `etag`. */
  patchEvent: (
    calendarId: string,
    eventId: string,
    body: GoogleEventBody,
    etag: string | null
  ) => Promise<GoogleEvent>;
  /** Succeeds when the event is already gone. */
  deleteEvent: (calendarId: string, eventId: string) => Promise<void>;
}

const describe = async (response: Response): Promise<string> => {
  try {
    // SAFETY: Google's error bodies have this shape; anything else falls through.
    const body = (await response.json()) as { error?: { message?: string } };

    return body.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
};

const calendarPath = (calendarId: string): string =>
  `/calendars/${encodeURIComponent(calendarId)}/events`;

const eventPath = (calendarId: string, eventId: string): string =>
  `${calendarPath(calendarId)}/${encodeURIComponent(eventId)}`;

/** Fetches a page, then the pages after it, one at a time. */
const allPages = async <Item>(
  fetchPage: (pageToken: string | undefined) => Promise<Page<Item>>,
  pageToken?: string
): Promise<{ items: Item[]; syncToken: string | null }> => {
  const page = await fetchPage(pageToken);
  const items = page.items ?? [];

  if (page.nextPageToken === undefined) {
    return { items, syncToken: page.nextSyncToken ?? null };
  }

  const rest = await allPages(fetchPage, page.nextPageToken);

  return { items: [...items, ...rest.items], syncToken: rest.syncToken };
};

const withPage = (
  query: URLSearchParams,
  pageToken: string | undefined
): string => {
  if (pageToken !== undefined) {
    query.set("pageToken", pageToken);
  }

  return query.toString();
};

export const createGoogleApi = ({
  fetch,
  session,
}: {
  fetch: Fetch;
  session: Session;
}): GoogleApi => {
  /** One request, refreshing the access token once if Google rejects it. */
  const send = async (
    path: string,
    init: RequestInit = {},
    retried = false
  ): Promise<Response> => {
    const headers = new Headers(init.headers);

    headers.set("authorization", `Bearer ${await session.accessToken()}`);

    if (init.body !== undefined) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(`${apiRoot}${path}`, { ...init, headers });

    if (response.status === 401 && !retried) {
      session.invalidate();

      return send(path, init, true);
    }

    return response;
  };

  const json = async <Result>(
    path: string,
    init?: RequestInit
  ): Promise<Result> => {
    const response = await send(path, init);

    if (!response.ok) {
      throw new GoogleApiError(response.status, await describe(response));
    }

    // SAFETY: a successful response has the documented resource shape.
    return (await response.json()) as Result;
  };

  return {
    deleteEvent: async (calendarId, eventId) => {
      const response = await send(eventPath(calendarId, eventId), {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 404 && response.status !== 410) {
        throw new GoogleApiError(response.status, await describe(response));
      }
    },

    getEvent: (calendarId, eventId) => json(eventPath(calendarId, eventId)),

    insertEvent: (calendarId, body) =>
      json(calendarPath(calendarId), {
        body: JSON.stringify(body),
        method: "POST",
      }),

    listCalendars: async () => {
      const { items } = await allPages((pageToken) =>
        json<Page<GoogleCalendarEntry>>(
          `/users/me/calendarList?${withPage(
            new URLSearchParams({ maxResults: "250" }),
            pageToken
          )}`
        )
      );

      return items;
    },

    listEvents: (calendarId, from) =>
      allPages((pageToken) =>
        json<Page<GoogleEvent>>(
          `${calendarPath(calendarId)}?${withPage(
            new URLSearchParams({
              maxResults: pageSize,
              singleEvents: "true",
              ...("syncToken" in from
                ? { syncToken: from.syncToken }
                : { timeMin: from.timeMin }),
            }),
            pageToken
          )}`
        )
      ),

    patchEvent: (calendarId, eventId, body, etag) =>
      json(eventPath(calendarId, eventId), {
        body: JSON.stringify(body),
        headers: etag === null ? {} : { "if-match": etag },
        method: "PATCH",
      }),
  };
};
