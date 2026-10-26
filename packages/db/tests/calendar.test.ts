import { afterEach, describe, expect, test } from "bun:test";

import { createCalendar } from "@productivity/calendar";
import type { StoredEvent } from "@productivity/calendar";

import type { Store } from "../src/index.ts";
import { memoryStore } from "./helpers.ts";

let store: Store;

afterEach(() => {
  store.close();
});

const google = {
  color: "#039BE5",
  id: "google:me@example.com",
  name: "me@example.com",
  position: 1,
  primary: true,
  remoteId: "me@example.com",
  source: "google" as const,
  syncToken: null,
  writable: true,
};

const event = (fields: Partial<StoredEvent>): StoredEvent => ({
  allDay: false,
  calendarId: google.id,
  editable: true,
  end: "2026-10-22T10:00:00.000Z",
  etag: null,
  id: "event",
  pending: null,
  recurring: false,
  remoteId: null,
  start: "2026-10-22T09:00:00.000Z",
  title: "Event",
  ...fields,
});

const window = {
  fromDate: "2026-10-22",
  fromInstant: "2026-10-22T00:00:00.000Z",
  toDate: "2026-10-23",
  toInstant: "2026-10-23T00:00:00.000Z",
};

describe("the calendar repository", () => {
  test("upserts events and finds them by Google's ID", () => {
    store = memoryStore();

    const repository = store.calendarRepository;

    repository.saveCalendar(google);
    repository.saveEvent(event({ remoteId: "abc" }));
    repository.saveEvent(event({ remoteId: "abc", title: "Renamed" }));

    expect(repository.findRemoteEvent(google.id, "abc")?.title).toBe("Renamed");
    expect(repository.findEvent("event")?.title).toBe("Renamed");
  });

  test("lists timed and all-day events that overlap the window", () => {
    store = memoryStore();

    const repository = store.calendarRepository;

    repository.saveCalendar(google);
    repository.saveEvent(event({ id: "inside" }));
    repository.saveEvent(
      event({
        end: "2026-10-22T00:00:00.000Z",
        id: "ends-at-start",
        start: "2026-10-21T23:00:00.000Z",
      })
    );
    repository.saveEvent(
      event({ allDay: true, end: "2026-10-23", id: "day", start: "2026-10-22" })
    );
    repository.saveEvent(
      event({
        allDay: true,
        end: "2026-10-22",
        id: "day-before",
        start: "2026-10-21",
      })
    );

    expect(repository.eventsIn(window).map((each) => each.id)).toEqual([
      "day",
      "inside",
    ]);
  });

  test("clearing synced events keeps changes waiting to be sent", () => {
    store = memoryStore();

    const repository = store.calendarRepository;

    repository.saveCalendar(google);
    repository.saveEvent(event({ id: "synced" }));
    repository.saveEvent(event({ id: "waiting", pending: "update" }));
    repository.clearSyncedEvents(google.id);

    expect(repository.pendingEvents().map((each) => each.id)).toEqual([
      "waiting",
    ]);
    expect(repository.eventsIn(window).map((each) => each.id)).toEqual([
      "waiting",
    ]);
  });

  test("deleting a calendar deletes its events", () => {
    store = memoryStore();

    const repository = store.calendarRepository;

    repository.saveCalendar(google);
    repository.saveEvent(event({}));
    repository.deleteCalendar(google.id);

    expect(repository.findEvent("event")).toBeUndefined();
    expect(repository.listCalendars().map((each) => each.id)).toEqual([
      "local",
    ]);
  });

  test("a failed transaction writes nothing", () => {
    store = memoryStore();

    const repository = store.calendarRepository;

    expect(() =>
      repository.transaction(() => {
        repository.saveCalendar(google);
        throw new Error("Interrupted");
      })
    ).toThrow("Interrupted");
    expect(repository.listCalendars()).toHaveLength(1);
  });
});

describe("the calendar on the database", () => {
  test("shows the sample week", () => {
    store = memoryStore(true);

    const calendar = createCalendar({
      repository: store.calendarRepository,
      syncDelayMs: null,
    });

    const week = calendar.listEvents("2026-10-19", "2026-10-26");

    expect(
      week.filter((each) => each.allDay).map((each) => each.title)
    ).toEqual(["Q4 planning week", "Eve's birthday"]);
    expect(week.find((each) => each.title === "Design review")).toMatchObject({
      end: "2026-10-19T12:00",
      start: "2026-10-19T11:00",
    });
  });

  test("keeps events across reopening", () => {
    store = memoryStore();

    const calendar = createCalendar({
      repository: store.calendarRepository,
      syncDelayMs: null,
    });

    const { id } = calendar.createEvent({
      allDay: false,
      end: "2026-10-22T11:00",
      start: "2026-10-22T10:00",
      title: "Dentist",
    });

    calendar.updateEvent(id, { title: "Orthodontist" });

    const again = createCalendar({
      repository: store.calendarRepository,
      syncDelayMs: null,
    });

    expect(again.listEvents("2026-10-22", "2026-10-23")).toMatchObject([
      { id, title: "Orthodontist" },
    ]);
  });
});
