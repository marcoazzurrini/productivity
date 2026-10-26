import type { RedirectListener, SecretStore } from "../src/index.ts";

/**
 * Google's OAuth and Calendar APIs, in memory, behind a fetch function. It
 * follows the documented behavior the sync relies on: sync tokens, 410 for
 * an expired token, etags with If-Match, and client-chosen event IDs.
 */

interface FakeTime {
  date?: string | null;
  dateTime?: string | null;
  timeZone?: string | null;
}

export interface FakeEvent {
  id: string;
  etag: string;
  status: "confirmed" | "cancelled";
  summary?: string;
  start: FakeTime;
  end: FakeTime;
  recurringEventId?: string;
  organizer?: { self?: boolean };
  eventType?: string;
}

export interface FakeCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
  accessRole: "owner" | "writer" | "reader" | "freeBusyReader";
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
}

type NewFakeEvent = Omit<FakeEvent, "etag" | "status"> & {
  status?: FakeEvent["status"];
};

/** Every JSON body the fake answers with. */
type FakeBody =
  | FakeEvent
  | { items: FakeEvent[] | FakeCalendar[]; nextSyncToken?: string }
  | { error: { code: number; message: string } }
  | { error: string; error_description?: string }
  | { access_token: string; expires_in: number; refresh_token?: string };

const json = (status: number, body: FakeBody): Response =>
  Response.json(body, { status });

const ignore = (): void => undefined;

const merge = (time: FakeTime, change: FakeTime | undefined): FakeTime =>
  Object.fromEntries(
    Object.entries({ ...time, ...change }).filter(([, value]) => value !== null)
  );

const apiError = (status: number, message: string): Response =>
  json(status, { error: { code: status, message } });

export const createFakeGoogle = () => {
  let version = 1;
  let tokenCount = 0;
  const accessTokens = new Set<string>();
  const refreshTokens = new Set<string>();
  const calendars = new Map<string, FakeCalendar>();
  const events = new Map<string, Map<string, FakeEvent>>();
  /** The change counter when each stored event last changed. */
  const versions = new WeakMap<FakeEvent, number>();
  /** Sync tokens Google has forgotten, so using one answers 410. */
  const expiredSyncTokens = new Set<string>();

  const authorizations: URLSearchParams[] = [];
  const headers: Headers[] = [];
  const requests: string[] = [];

  const state = {
    /** Authorization requests seen, with their query parameters. */
    authorizations,
    /** Each request's headers, in the same order. */
    headers,
    offline: false,
    /** Every request, as "METHOD path". */
    requests,
  };

  const addCalendar = (calendar: FakeCalendar): FakeCalendar => {
    const created = { ...calendar };

    calendars.set(calendar.id, created);
    events.set(calendar.id, new Map());

    return created;
  };

  const calendarOf = (calendarId: string): FakeCalendar => {
    const calendar = calendars.get(calendarId);

    if (calendar === undefined) {
      throw new Error(`The fake has no calendar ${calendarId}.`);
    }

    return calendar;
  };

  /** The events Google holds for a calendar, cancelled ones included. */
  const eventsOf = (calendarId: string): Map<string, FakeEvent> =>
    events.get(calendarOf(calendarId).id) ?? new Map();

  /** Makes a change as if the user made it in Google Calendar. */
  const putEvent = (calendarId: string, event: NewFakeEvent): FakeEvent => {
    version += 1;

    const stored: FakeEvent = {
      status: "confirmed",
      ...event,
      etag: `"etag-${version}"`,
    };

    versions.set(stored, version);
    eventsOf(calendarId).set(event.id, stored);

    return stored;
  };

  const editEvent = (
    calendarId: string,
    eventId: string,
    changes: Partial<FakeEvent>
  ): FakeEvent => {
    const current = eventsOf(calendarId).get(eventId);

    if (current === undefined) {
      throw new Error(`The fake has no event ${eventId}.`);
    }

    return putEvent(calendarId, { ...current, ...changes });
  };

  const removeEvent = (calendarId: string, eventId: string): void => {
    editEvent(calendarId, eventId, { status: "cancelled" });
  };

  const issueTokens = (withRefresh: boolean) => {
    tokenCount += 1;

    const access = `access-${tokenCount}`;

    accessTokens.add(access);

    if (!withRefresh) {
      return { access_token: access, expires_in: 3600 };
    }

    const refresh = `refresh-${tokenCount}`;

    refreshTokens.add(refresh);

    return { access_token: access, expires_in: 3600, refresh_token: refresh };
  };

  const tokenEndpoint = (body: URLSearchParams): Response => {
    if (body.get("grant_type") === "authorization_code") {
      if (
        body.get("code") !== "good-code" ||
        body.get("code_verifier") === null
      ) {
        return json(400, { error: "invalid_grant" });
      }

      return json(200, issueTokens(true));
    }

    if (!refreshTokens.has(body.get("refresh_token") ?? "")) {
      return json(400, {
        error: "invalid_grant",
        error_description: "Token has been expired or revoked.",
      });
    }

    return json(200, issueTokens(false));
  };

  const listEvents = (calendar: FakeCalendar, query: URLSearchParams) => {
    const syncToken = query.get("syncToken");

    if (syncToken !== null && expiredSyncTokens.has(syncToken)) {
      return apiError(410, "Sync token is no longer valid.");
    }

    const all = [...eventsOf(calendar.id).values()];

    const items =
      syncToken === null
        ? all.filter(
            (event) =>
              event.status !== "cancelled" &&
              (event.end.dateTime ?? `${event.end.date}T00:00:00Z`) >
                (query.get("timeMin") ?? "")
          )
        : all.filter((event) => (versions.get(event) ?? 0) > Number(syncToken));

    return json(200, { items, nextSyncToken: String(version) });
  };

  const eventsEndpoint = async (
    method: string,
    calendar: FakeCalendar,
    eventId: string | undefined,
    request: Request,
    query: URLSearchParams
  ): Promise<Response> => {
    if (eventId === undefined) {
      if (method === "GET") {
        return listEvents(calendar, query);
      }

      // SAFETY: the client under test sends JSON event bodies.
      const body = (await request.json()) as Partial<FakeEvent>;
      const id = body.id ?? `server-${version}`;

      if (eventsOf(calendar.id).has(id)) {
        return apiError(409, "The requested identifier already exists.");
      }

      if (calendar.accessRole === "reader") {
        return apiError(
          403,
          "You need to have writer access to this calendar."
        );
      }

      return json(
        200,
        putEvent(calendar.id, {
          end: body.end ?? {},
          id,
          organizer: { self: true },
          start: body.start ?? {},
          summary: body.summary,
        })
      );
    }

    const current = eventsOf(calendar.id).get(eventId);

    if (
      current === undefined ||
      (current.status === "cancelled" && method !== "DELETE")
    ) {
      return apiError(404, "Not Found");
    }

    if (method === "GET") {
      return json(200, current);
    }

    if (calendar.accessRole === "reader") {
      return apiError(403, "You need to have writer access to this calendar.");
    }

    const ifMatch = request.headers.get("if-match");

    if (ifMatch !== null && ifMatch !== current.etag) {
      return apiError(412, "Precondition Failed");
    }

    if (method === "DELETE") {
      if (current.status === "cancelled") {
        return apiError(410, "Resource has been deleted");
      }

      removeEvent(calendar.id, eventId);

      return new Response(null, { status: 204 });
    }

    // SAFETY: the client under test sends JSON event bodies.
    const body = (await request.json()) as Partial<FakeEvent>;

    return json(
      200,
      putEvent(calendar.id, {
        ...current,
        end: merge(current.end, body.end),
        start: merge(current.start, body.start),
        summary: body.summary ?? current.summary,
      })
    );
  };

  const fetch = async (
    input: string,
    init?: RequestInit
  ): Promise<Response> => {
    const request = new Request(input, init);
    const url = new URL(request.url);

    state.requests.push(`${request.method} ${url.pathname}${url.search}`);
    state.headers.push(request.headers);

    if (state.offline) {
      throw new TypeError("fetch failed");
    }

    if (url.origin === "https://oauth2.googleapis.com") {
      const body = new URLSearchParams(await request.text());

      if (url.pathname === "/revoke") {
        refreshTokens.delete(body.get("token") ?? "");

        return new Response(null, { status: 200 });
      }

      return tokenEndpoint(body);
    }

    const bearer = request.headers.get("authorization")?.replace("Bearer ", "");

    if (bearer === undefined || !accessTokens.has(bearer)) {
      return apiError(401, "Invalid Credentials");
    }

    const path = url.pathname.replace("/calendar/v3", "");

    if (path === "/users/me/calendarList") {
      return json(200, { items: [...calendars.values()] });
    }

    const groups =
      /^\/calendars\/(?<calendar>[^/]+)\/events(?:\/(?<event>[^/]+))?$/u.exec(
        path
      )?.groups;

    const calendar = calendars.get(decodeURIComponent(groups?.calendar ?? ""));

    if (groups === undefined || calendar === undefined) {
      return apiError(404, "Not Found");
    }

    return eventsEndpoint(
      request.method,
      calendar,
      groups.event === undefined ? undefined : decodeURIComponent(groups.event),
      request,
      url.searchParams
    );
  };

  /** The browser and loopback listener, with a user who always says yes. */
  const devices = (answer: "allow" | "deny" | "ignore" = "allow") => {
    let redirect = Promise.withResolvers<URLSearchParams>();

    const listenForRedirect = (): Promise<RedirectListener> => {
      redirect = Promise.withResolvers<URLSearchParams>();

      return Promise.resolve({
        close: ignore,
        redirectUri: "http://127.0.0.1:53682",
        result: redirect.promise,
      });
    };

    const openBrowser = (url: string): void => {
      const query = new URL(url).searchParams;

      state.authorizations.push(query);

      if (answer === "ignore") {
        return;
      }

      redirect.resolve(
        new URLSearchParams(
          answer === "allow"
            ? { code: "good-code", state: query.get("state") ?? "" }
            : { error: "access_denied", state: query.get("state") ?? "" }
        )
      );
    };

    return { listenForRedirect, openBrowser };
  };

  return {
    addCalendar,
    calendarOf,
    devices,
    editEvent,
    eventsOf,
    /** Makes Google forget every sync token issued so far. */
    expireSyncTokens: () => {
      for (let token = 0; token <= version; token += 1) {
        expiredSyncTokens.add(String(token));
      }
    },
    fetch,
    putEvent,
    removeEvent,
    /** As if the user removed the app's access in their Google account. */
    revokeAll: () => {
      refreshTokens.clear();
      accessTokens.clear();
    },
    state,
  };
};

export type FakeGoogle = ReturnType<typeof createFakeGoogle>;

export const memorySecrets = (): SecretStore & { value: string | null } => {
  const secrets: SecretStore & { value: string | null } = {
    read: () => secrets.value,
    value: null,
    write: (value: string | null) => {
      secrets.value = value;
    },
  };

  return secrets;
};
