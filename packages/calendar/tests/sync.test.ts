import { beforeEach, describe, expect, test } from "bun:test";

import { CalendarError, createCalendar } from "../src/index.ts";
import type { CalendarService } from "../src/index.ts";
import { createFakeGoogle, memorySecrets } from "./fake-google.ts";
import type { FakeGoogle } from "./fake-google.ts";
import { memoryRepository } from "./memory-repository.ts";

/** Thursday 23 October 2026, 14:40 local time. */
const now = new Date(2026, 9, 23, 14, 40);
const week = ["2026-10-19", "2026-10-26"] as const;
const primary = "marco@example.com";

/** A local wall-clock time as Google writes it: a UTC instant. */
const at = (day: number, hours: number, minutes = 0): string =>
  new Date(2026, 9, day, hours, minutes).toISOString();

let google: FakeGoogle;
let secrets: ReturnType<typeof memorySecrets>;
let repository: ReturnType<typeof memoryRepository>;

const open = (answer: "allow" | "deny" | "ignore" = "allow"): CalendarService =>
  createCalendar({
    clock: () => now,
    google: {
      ...google.devices(answer),
      client: { clientId: "client-id", clientSecret: "not-secret" },
      fetch: google.fetch,
      secrets,
    },
    repository,
    syncDelayMs: null,
  });

const titles = (calendar: CalendarService): string[] =>
  calendar
    .listEvents(...week)
    .map((event) => event.title)
    .toSorted();

beforeEach(() => {
  google = createFakeGoogle();
  secrets = memorySecrets();
  repository = memoryRepository();

  google.addCalendar({
    accessRole: "owner",
    backgroundColor: "#039BE5",
    id: primary,
    primary: true,
    summary: primary,
  });
  google.putEvent(primary, {
    end: { dateTime: at(22, 11) },
    id: "planning",
    start: { dateTime: at(22, 10) },
    summary: "Q4 planning",
  });
});

const connected = async (): Promise<CalendarService> => {
  const calendar = open();

  await calendar.connectGoogle();

  return calendar;
};

describe("connecting", () => {
  test("signs in with PKCE, keeps the refresh token, and syncs", async () => {
    const calendar = open();

    expect(calendar.syncStatus()).toEqual({
      error: null,
      state: "disconnected",
    });

    const status = await calendar.connectGoogle();
    const [authorization] = google.state.authorizations;

    expect(authorization?.get("code_challenge_method")).toBe("S256");
    expect(authorization?.get("access_type")).toBe("offline");
    expect(authorization?.get("redirect_uri")).toBe("http://127.0.0.1:53682");
    expect(authorization?.get("scope")).toContain("calendar.events");
    expect(secrets.value).toBe("refresh-1");
    expect(status).toEqual({
      account: primary,
      error: null,
      lastSyncedAt: now.toISOString(),
      state: "connected",
      syncing: false,
    });
    expect(titles(calendar)).toEqual(["Q4 planning"]);
  });

  test("new events go to the Google primary calendar once connected", async () => {
    const calendar = await connected();

    expect(
      calendar.listCalendars().map((each) => [each.name, each.isDefault])
    ).toEqual([
      ["On this Mac", false],
      [primary, true],
    ]);
  });

  test("reports a refused sign-in and stays disconnected", async () => {
    const status = await open("deny").connectGoogle();

    expect(status).toEqual({
      error: "Google access was not granted.",
      state: "disconnected",
    });
    expect(secrets.value).toBeNull();
  });

  test("disconnecting cancels a sign-in still waiting for the browser", async () => {
    const calendar = open("ignore");
    const connecting = calendar.connectGoogle();

    expect(calendar.syncStatus()).toEqual({ state: "connecting" });
    await calendar.disconnectGoogle();

    await expect(connecting).resolves.toEqual({
      error: null,
      state: "disconnected",
    });
  });

  test("stays signed in across launches", async () => {
    await connected();

    const reopened = open();

    expect(reopened.syncStatus()).toMatchObject({
      account: primary,
      state: "connected",
    });
    expect(titles(reopened)).toEqual(["Q4 planning"]);
  });

  test("disconnecting signs out at Google and removes its events", async () => {
    const calendar = await connected();

    await calendar.disconnectGoogle();

    expect(secrets.value).toBeNull();
    expect(google.state.requests).toContain("POST /revoke");
    expect(titles(calendar)).toEqual([]);
    expect(calendar.listCalendars().map((each) => each.id)).toEqual(["local"]);
  });

  test("a revoked grant signs out with a message", async () => {
    const calendar = await connected();

    google.revokeAll();

    expect(await calendar.sync()).toEqual({
      error: "Google signed this app out. Connect again to keep syncing.",
      state: "disconnected",
    });
    expect(secrets.value).toBeNull();
    expect(titles(calendar)).toEqual([]);
  });
});

describe("bringing in Google's events", () => {
  test("marks what the user may not change", async () => {
    google.addCalendar({
      accessRole: "reader",
      backgroundColor: "#0B8043",
      id: "holidays",
      summary: "Holidays",
    });
    google.putEvent("holidays", {
      end: { date: "2026-10-24" },
      id: "holiday",
      start: { date: "2026-10-23" },
      summary: "Festival",
    });
    google.putEvent(primary, {
      end: { dateTime: at(21, 16) },
      id: "invite",
      organizer: { self: false },
      start: { dateTime: at(21, 15) },
      summary: "Their meeting",
    });
    google.putEvent(primary, {
      end: { dateTime: at(20, 9, 30) },
      id: "standup_20261020T080000Z",
      recurringEventId: "standup",
      start: { dateTime: at(20, 9) },
      summary: "Standup",
    });

    const calendar = await connected();

    const byTitle = new Map(
      calendar.listEvents(...week).map((event) => [event.title, event])
    );

    expect(byTitle.get("Festival")).toMatchObject({
      allDay: true,
      color: "#0B8043",
      editable: false,
      end: "2026-10-24",
      start: "2026-10-23",
    });
    expect(byTitle.get("Their meeting")?.editable).toBe(false);
    expect(byTitle.get("Standup")).toMatchObject({
      editable: true,
      end: "2026-10-20T09:30",
      recurring: true,
      start: "2026-10-20T09:00",
    });
    expect(byTitle.get("Q4 planning")).toMatchObject({
      color: "#039BE5",
      editable: true,
      end: "2026-10-22T11:00",
      start: "2026-10-22T10:00",
    });

    const festival = byTitle.get("Festival")?.id ?? "";

    expect(() => calendar.deleteEvent(festival)).toThrow(CalendarError);
  });

  test("skips hidden calendars and working-location markers", async () => {
    google.addCalendar({
      accessRole: "owner",
      backgroundColor: "#000000",
      hidden: true,
      id: "secret",
      summary: "Hidden",
    });
    google.putEvent(primary, {
      end: { date: "2026-10-21" },
      eventType: "workingLocation",
      id: "home",
      start: { date: "2026-10-20" },
      summary: "Home",
    });

    const calendar = await connected();

    expect(calendar.listCalendars()).toHaveLength(2);
    expect(titles(calendar)).toEqual(["Q4 planning"]);
  });

  test("asks only for changes after the first sync", async () => {
    const calendar = await connected();

    google.editEvent(primary, "planning", { summary: "Q4 planning (moved)" });
    google.putEvent(primary, {
      end: { dateTime: at(24, 13) },
      id: "lunch",
      start: { dateTime: at(24, 12) },
      summary: "Lunch",
    });
    await calendar.sync();

    const lists = google.state.requests.filter((request) =>
      request.startsWith("GET /calendar/v3/calendars/")
    );

    expect(lists[0]).toContain("timeMin=");
    expect(lists[1]).toContain("syncToken=");
    expect(titles(calendar)).toEqual(["Lunch", "Q4 planning (moved)"]);
  });

  test("removes events deleted in Google", async () => {
    const calendar = await connected();

    google.removeEvent(primary, "planning");
    await calendar.sync();

    expect(titles(calendar)).toEqual([]);
  });

  test("starts over when Google forgets the sync token", async () => {
    const calendar = await connected();

    google.expireSyncTokens();
    google.editEvent(primary, "planning", { summary: "Renamed" });
    await calendar.sync();

    expect(titles(calendar)).toEqual(["Renamed"]);
  });

  test("tells listeners when a sync finishes", async () => {
    const calendar = await connected();
    let calls = 0;

    calendar.subscribe(() => {
      calls += 1;
    });
    await calendar.sync();

    // Once when syncing starts, once when it ends.
    expect(calls).toBe(2);
  });
});

describe("sending changes to Google", () => {
  test("creates, moves and deletes events in Google", async () => {
    const calendar = await connected();

    const created = calendar.createEvent({
      allDay: false,
      end: "2026-10-23T17:00",
      start: "2026-10-23T16:00",
      title: "Gym",
    });

    await calendar.sync();

    const remoteId = created.id.replaceAll("-", "");
    const atGoogle = () => google.eventsOf(primary).get(remoteId);

    expect(atGoogle()).toMatchObject({
      end: { dateTime: at(23, 17) },
      start: { dateTime: at(23, 16) },
      summary: "Gym",
    });

    calendar.updateEvent(created.id, {
      allDay: true,
      end: "2026-10-24",
      start: "2026-10-23",
    });
    await calendar.sync();

    expect(atGoogle()).toMatchObject({
      end: { date: "2026-10-24" },
      start: { date: "2026-10-23" },
    });
    expect(atGoogle()?.start.dateTime).toBeUndefined();

    calendar.deleteEvent(created.id);
    expect(titles(calendar)).toEqual(["Q4 planning"]);
    await calendar.sync();

    expect(atGoogle()?.status).toBe("cancelled");
    expect(titles(calendar)).toEqual(["Q4 planning"]);
    // The local ID never changes, so the app can keep pointing at it.
    expect(calendar.listEvents(...week).map((event) => event.id)).not.toContain(
      created.id
    );
  });

  test("sends a patch with the etag Google last sent", async () => {
    const calendar = await connected();
    const [planning] = calendar.listEvents(...week);

    calendar.updateEvent(planning?.id ?? "", { title: "Planning" });
    await calendar.sync();

    const patch = google.state.requests.findIndex((request) =>
      request.startsWith("PATCH")
    );

    expect(google.state.headers[patch]?.get("if-match")).toBe('"etag-2"');
    expect(google.eventsOf(primary).get("planning")?.summary).toBe("Planning");
  });

  test("keeps Google's version when both sides changed an event", async () => {
    const calendar = await connected();
    const [planning] = calendar.listEvents(...week);

    google.editEvent(primary, "planning", { summary: "Changed in Google" });
    calendar.updateEvent(planning?.id ?? "", { title: "Changed here" });
    await calendar.sync();

    expect(titles(calendar)).toEqual(["Changed in Google"]);
    expect(calendar.syncStatus()).toMatchObject({ error: null });
  });

  test("keeps changes made offline and sends them later", async () => {
    const calendar = await connected();

    google.state.offline = true;
    calendar.createEvent({
      allDay: false,
      end: "2026-10-24T11:00",
      start: "2026-10-24T10:00",
      title: "Offline idea",
    });

    expect(await calendar.sync()).toMatchObject({
      error: "fetch failed",
      state: "connected",
    });
    expect(titles(calendar)).toEqual(["Offline idea", "Q4 planning"]);

    google.state.offline = false;
    await calendar.sync();

    expect(
      [...google.eventsOf(primary).values()].map((event) => event.summary)
    ).toContain("Offline idea");
    expect(calendar.syncStatus()).toMatchObject({ error: null });
  });

  test("does not duplicate an event whose first send got no reply", async () => {
    const calendar = await connected();

    const created = calendar.createEvent({
      allDay: false,
      end: "2026-10-24T11:00",
      start: "2026-10-24T10:00",
      title: "Once",
    });

    // Google stored it, but the reply never reached the app.
    google.putEvent(primary, {
      end: { dateTime: at(24, 11) },
      id: created.id.replaceAll("-", ""),
      start: { dateTime: at(24, 10) },
      summary: "Once",
    });
    await calendar.sync();

    expect(titles(calendar)).toEqual(["Once", "Q4 planning"]);
    expect(google.eventsOf(primary).size).toBe(2);
  });

  test("restores Google's version when Google refuses a change", async () => {
    google.addCalendar({
      accessRole: "writer",
      backgroundColor: "#F4511E",
      id: "team",
      summary: "Team",
    });
    google.putEvent("team", {
      end: { dateTime: at(21, 13) },
      id: "retro",
      start: { dateTime: at(21, 12) },
      summary: "Retro",
    });

    const calendar = await connected();

    const retro = calendar
      .listEvents(...week)
      .find((event) => event.title === "Retro");

    // Someone made the calendar read-only after the last sync.
    google.calendarOf("team").accessRole = "reader";
    calendar.createEvent({
      allDay: false,
      calendarId: "google:team",
      end: "2026-10-24T11:00",
      start: "2026-10-24T10:00",
      title: "Refused",
    });
    calendar.updateEvent(retro?.id ?? "", { title: "Renamed" });
    await calendar.sync();

    expect(titles(calendar)).toEqual(["Q4 planning", "Retro"]);
  });

  test("a change made during a sync goes out in another round", async () => {
    const calendar = await connected();
    const first = calendar.sync();

    calendar.createEvent({
      allDay: true,
      end: "2026-10-25",
      start: "2026-10-24",
      title: "Mid-sync",
    });
    await Promise.all([first, calendar.sync()]);

    expect(
      [...google.eventsOf(primary).values()].map((event) => event.summary)
    ).toContain("Mid-sync");
  });
});
