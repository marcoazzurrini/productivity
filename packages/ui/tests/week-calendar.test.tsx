import { describe, expect, mock, test } from "bun:test";

import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WeekCalendar, taskDragType } from "../src/index.ts";
import type { CalendarDay } from "../src/index.ts";

const days: CalendarDay[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
].map((weekday, index) => ({
  dayNumber: 20 + index,
  isToday: index === 3,
  key: `day-${index}`,
  weekday,
}));

const noop = (): void => undefined;

describe("WeekCalendar", () => {
  test("shows seven days and marks today", () => {
    render(
      <WeekCalendar
        days={days}
        items={[]}
        onNext={noop}
        onPrevious={noop}
        onToday={noop}
        title="October 2026"
      />
    );

    const today = screen.getByText("23").parentElement;

    expect(today?.getAttribute("aria-current")).toBe("date");
    expect(screen.getByText("Sun")).toBeDefined();
  });

  test("draws the now line only when a time is given", () => {
    const { rerender } = render(
      <WeekCalendar
        days={days}
        items={[]}
        nowMinute={880}
        onNext={noop}
        onPrevious={noop}
        onToday={noop}
        title="W"
      />
    );

    expect(screen.getByText("Current time")).toBeDefined();

    rerender(
      <WeekCalendar
        days={days}
        items={[]}
        onNext={noop}
        onPrevious={noop}
        onToday={noop}
        title="W"
      />
    );

    expect(screen.queryByText("Current time")).toBeNull();
  });

  test("navigates between weeks", async () => {
    const onNext = mock();
    const onPrevious = mock();

    render(
      <WeekCalendar
        days={days}
        items={[]}
        onNext={onNext}
        onPrevious={onPrevious}
        onToday={noop}
        title="W"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Previous week" })
    );

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  test("opens an item when it is clicked", async () => {
    const onItemOpen = mock();

    render(
      <WeekCalendar
        days={days}
        items={[
          {
            dayIndex: 1,
            endMinute: 660,
            id: "e1",
            kind: "meeting",
            startMinute: 600,
            title: "1:1 with Olivia",
          },
        ]}
        onItemOpen={onItemOpen}
        onNext={noop}
        onPrevious={noop}
        onToday={noop}
        title="W"
      />
    );
    await userEvent.click(
      screen.getByRole("button", { name: /1:1 with Olivia/u })
    );

    expect(onItemOpen).toHaveBeenCalledWith("e1");
  });

  test("time-blocks a dropped task, snapped to 15 minutes", () => {
    const onDropTask = mock();

    render(
      <WeekCalendar
        days={days}
        items={[]}
        onDropTask={onDropTask}
        onNext={noop}
        onPrevious={noop}
        onToday={noop}
        title="W"
      />
    );
    const thursday = screen.getByRole("list", { name: "Thu 23" });

    const drop = createEvent.drop(thursday, {
      dataTransfer: { getData: () => "task-1", types: [taskDragType] },
    });

    // happy-dom ignores clientY in the event init, so set it directly.
    // 100 px below the 7 AM line at 80 px an hour is 8:15 AM.
    Object.defineProperty(drop, "clientY", { value: 100 });
    fireEvent(thursday, drop);

    expect(onDropTask).toHaveBeenCalledWith("task-1", 3, 495);
  });

  test("ignores drops that are not tasks", () => {
    const onDropTask = mock();

    render(
      <WeekCalendar
        days={days}
        items={[]}
        onDropTask={onDropTask}
        onNext={noop}
        onPrevious={noop}
        onToday={noop}
        title="W"
      />
    );
    fireEvent.drop(screen.getByRole("list", { name: "Mon 20" }), {
      clientY: 10,
      dataTransfer: { getData: () => "", types: ["text/plain"] },
    });

    expect(onDropTask).not.toHaveBeenCalled();
  });
});
