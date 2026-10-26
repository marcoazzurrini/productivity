import { describe, expect, test } from "bun:test";

import { CalendarError, createCalendar } from "../src/index.ts";
import { memoryRepository } from "./memory-repository.ts";

const localCalendar = () =>
  createCalendar({ repository: memoryRepository(), syncDelayMs: null });

describe("a calendar without Google", () => {
  test("has one local calendar, used by default", () => {
    const calendar = localCalendar();

    expect(calendar.listCalendars()).toEqual([
      {
        color: "#0070E0",
        id: "local",
        isDefault: true,
        name: "On this Mac",
        source: "local",
        writable: true,
      },
    ]);
    expect(calendar.syncStatus()).toEqual({ state: "unavailable" });
  });

  test("creates a timed event and lists it in its week only", () => {
    const calendar = localCalendar();

    const created = calendar.createEvent({
      allDay: false,
      end: "2026-10-22T11:30",
      start: "2026-10-22T10:00",
      title: "  Q4 planning ",
    });

    expect(created).toMatchObject({
      allDay: false,
      calendarId: "local",
      editable: true,
      end: "2026-10-22T11:30",
      recurring: false,
      start: "2026-10-22T10:00",
      title: "Q4 planning",
    });
    expect(calendar.listEvents("2026-10-19", "2026-10-26")).toEqual([created]);
    expect(calendar.listEvents("2026-10-26", "2026-11-02")).toEqual([]);
  });

  test("lists events that cross into the window", () => {
    const calendar = localCalendar();

    calendar.createEvent({
      allDay: false,
      end: "2026-10-26T01:00",
      start: "2026-10-25T23:00",
      title: "Night shift",
    });

    expect(calendar.listEvents("2026-10-26", "2026-10-27")).toHaveLength(1);
    expect(calendar.listEvents("2026-10-24", "2026-10-25")).toHaveLength(0);
  });

  test("all-day events end on the day after their last day", () => {
    const calendar = localCalendar();

    calendar.createEvent({
      allDay: true,
      end: "2026-10-24",
      start: "2026-10-22",
      title: "Offsite",
    });

    expect(calendar.listEvents("2026-10-23", "2026-10-24")).toHaveLength(1);
    expect(calendar.listEvents("2026-10-24", "2026-10-25")).toHaveLength(0);
  });

  test("moves, resizes, renames and deletes an event", () => {
    const calendar = localCalendar();

    const { id } = calendar.createEvent({
      allDay: false,
      end: "2026-10-22T11:00",
      start: "2026-10-22T10:00",
      title: "Dentist",
    });

    expect(
      calendar.updateEvent(id, {
        end: "2026-10-23T16:30",
        start: "2026-10-23T15:00",
      })
    ).toMatchObject({ end: "2026-10-23T16:30", start: "2026-10-23T15:00" });

    expect(calendar.updateEvent(id, { title: "Orthodontist" })).toMatchObject({
      start: "2026-10-23T15:00",
      title: "Orthodontist",
    });

    expect(
      calendar.updateEvent(id, {
        allDay: true,
        end: "2026-10-24",
        start: "2026-10-23",
      })
    ).toMatchObject({ allDay: true, end: "2026-10-24", start: "2026-10-23" });

    calendar.deleteEvent(id);

    expect(calendar.listEvents("2026-10-19", "2026-10-26")).toEqual([]);
    expect(() => calendar.deleteEvent(id)).toThrow(CalendarError);
  });

  test("refuses times that make no sense", () => {
    const calendar = localCalendar();

    const event =
      (start: string, end: string, allDay = false) =>
      () =>
        calendar.createEvent({ allDay, end, start, title: "Bad" });

    expect(event("2026-10-22T11:00", "2026-10-22T10:00")).toThrow(
      CalendarError
    );
    expect(event("2026-10-22T10:00", "2026-10-22T10:00")).toThrow(
      CalendarError
    );
    expect(event("2026-02-30T10:00", "2026-02-30T11:00")).toThrow(
      CalendarError
    );
    expect(event("2026-10-22T24:00", "2026-10-22T25:00")).toThrow(
      CalendarError
    );
    expect(event("2026-10-22", "2026-10-23")).toThrow(CalendarError);
    expect(event("2026-10-22T10:00", "2026-10-22T11:00", true)).toThrow(
      CalendarError
    );
    expect(() => calendar.listEvents("2026-10-26", "2026-10-19")).toThrow(
      CalendarError
    );
  });

  test("switching to all-day needs new times", () => {
    const calendar = localCalendar();

    const { id } = calendar.createEvent({
      allDay: false,
      end: "2026-10-22T11:00",
      start: "2026-10-22T10:00",
      title: "Dentist",
    });

    expect(() => calendar.updateEvent(id, { allDay: true })).toThrow(
      CalendarError
    );
  });

  test("refuses calendars that do not exist", () => {
    const calendar = localCalendar();

    expect(() =>
      calendar.createEvent({
        allDay: true,
        calendarId: "nope",
        end: "2026-10-23",
        start: "2026-10-22",
        title: "Lost",
      })
    ).toThrow(CalendarError);
  });

  test("keeps the wall-clock time across a daylight-saving change", () => {
    const previous = process.env.TZ;

    process.env.TZ = "Europe/Rome";

    try {
      const calendar = localCalendar();

      // Clocks go back at 03:00 on Sunday 25 October 2026 in Rome.
      calendar.createEvent({
        allDay: false,
        end: "2026-10-24T10:00",
        start: "2026-10-24T09:00",
        title: "Saturday",
      });
      calendar.createEvent({
        allDay: false,
        end: "2026-10-26T10:00",
        start: "2026-10-26T09:00",
        title: "Monday",
      });

      expect(
        calendar
          .listEvents("2026-10-24", "2026-10-27")
          .map((event) => [event.title, event.start])
      ).toEqual([
        ["Saturday", "2026-10-24T09:00"],
        ["Monday", "2026-10-26T09:00"],
      ]);
    } finally {
      process.env.TZ = previous;
    }
  });
});
