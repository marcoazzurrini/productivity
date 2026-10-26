import { createCalendar } from "@productivity/calendar";
import { openStore } from "@productivity/db";
import { describe, expect, it } from "vitest";

import {
  UnknownCalendarMethodError,
  callCalendar,
} from "../src/main/calendar-handler.ts";

const open = () => {
  const store = openStore({ path: ":memory:" });

  return {
    calendar: createCalendar({
      repository: store.calendarRepository,
      syncDelayMs: null,
    }),
    store,
  };
};

describe(callCalendar, () => {
  it("runs a calendar method with the given arguments", async () => {
    const { calendar, store } = open();

    await expect(
      callCalendar(calendar, "createEvent", [
        {
          allDay: true,
          end: "2026-10-24",
          start: "2026-10-23",
          title: "From the renderer",
        },
      ])
    ).resolves.toMatchObject({
      calendarId: "local",
      title: "From the renderer",
    });
    store.close();
  });

  it("refuses anything that is not a calendar method", () => {
    const { calendar, store } = open();

    expect(() => callCalendar(calendar, "subscribe", [])).toThrow(
      UnknownCalendarMethodError
    );
    expect(() => callCalendar(calendar, "close", [])).toThrow(
      UnknownCalendarMethodError
    );
    store.close();
  });

  it("lets the calendar refuse bad values from the renderer", async () => {
    const { calendar, store } = open();

    await expect(
      callCalendar(calendar, "createEvent", [
        // SAFETY: deliberately malformed, as a compromised renderer might send.
        { allDay: "yes", end: 1, start: null, title: {} } as never,
      ])
    ).rejects.toThrow("allDay must be true or false.");
    store.close();
  });
});
