import { describe, expect, mock, test } from "bun:test";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WeekCalendar } from "../src/index.ts";
import type { CalendarEntry, WeekCalendarProps } from "../src/index.ts";

const noop = (): void => undefined;

const entries: CalendarEntry[] = [
  {
    allDay: false,
    color: "#039BE5",
    editable: true,
    end: "2026-10-22T11:00",
    id: "planning",
    kind: "event",
    start: "2026-10-22T10:00",
    title: "Q4 planning",
  },
  {
    allDay: false,
    detail: "Prepare Presentation",
    done: true,
    editable: true,
    end: "2026-10-23T12:00",
    id: "slides",
    kind: "task",
    start: "2026-10-23T11:00",
    title: "Draft slide outline",
  },
  {
    allDay: true,
    color: "#8E24AA",
    editable: false,
    end: "2026-10-24",
    id: "offsite",
    kind: "event",
    start: "2026-10-22",
    title: "Offsite",
  },
];

const calendar = (props: Partial<WeekCalendarProps> = {}) => (
  <WeekCalendar
    date="2026-10-23"
    entries={entries}
    onNext={noop}
    onPrevious={noop}
    onToday={noop}
    subtitle="Week 43"
    title="October 2026"
    {...props}
  />
);

describe("WeekCalendar", () => {
  test("shows the week from Monday, with its entries", () => {
    render(calendar());

    expect(screen.getByRole("heading", { name: "October 2026" })).toBeDefined();
    expect(screen.getByText("Mon")).toBeDefined();
    expect(screen.getByText("19")).toBeDefined();
    expect(screen.getByText("Q4 planning")).toBeDefined();
    expect(screen.getByText("Offsite")).toBeDefined();
    expect(screen.getByText("Draft slide outline")).toBeDefined();
    expect(screen.getByLabelText("Done")).toBeDefined();
  });

  test("shows a short entry on one line, with its start time", () => {
    const standup: CalendarEntry = {
      allDay: false,
      color: "#039BE5",
      editable: true,
      end: "2026-10-21T09:15",
      id: "standup",
      kind: "event",
      start: "2026-10-21T09:00",
      title: "Team standup",
    };

    render(calendar({ entries: [standup] }));

    expect(screen.getByText("Team standup")).toBeDefined();
    expect(screen.getByText("9:00")).toBeDefined();
  });

  test("shows a whole day, one row per hour", () => {
    const { container } = render(calendar());

    const times = [
      ...new Set(
        [...container.querySelectorAll<HTMLElement>("[data-time]")].map(
          (slot) => slot.dataset.time
        )
      ),
    ];

    expect(times).toHaveLength(24);
    expect(times[0]).toBe("00:00:00");
    expect(times.at(-1)).toBe("23:00:00");
  });

  test("navigates between weeks", async () => {
    const onNext = mock();
    const onPrevious = mock();
    const onToday = mock();

    render(calendar({ onNext, onPrevious, onToday }));

    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Previous week" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Today" }));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onToday).toHaveBeenCalledTimes(1);
  });

  test("opens an entry when it is clicked", async () => {
    const onEntryOpen = mock();

    render(calendar({ onEntryOpen }));
    await userEvent.click(screen.getByText("Q4 planning"));

    expect(onEntryOpen).toHaveBeenCalledWith("planning");
  });

  test("shows extra header controls", () => {
    render(calendar({ actions: <button type="button">Sync</button> }));

    expect(screen.getByRole("button", { name: "Sync" })).toBeDefined();
  });

  test("moves to the week of a new date", () => {
    const { rerender } = render(calendar());

    rerender(calendar({ date: "2026-10-30", entries: [] }));

    expect(screen.getByText("26")).toBeDefined();
    expect(screen.queryByText("19")).toBeNull();
  });
});
