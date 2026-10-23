import {
  addDays,
  datePart,
  minuteOfDay,
  toLocalDate,
  toLocalDateTime,
  weekDays,
} from "@productivity/gtd";
import type { LocalDate, ProjectDetail, Task } from "@productivity/gtd";
import { WeekCalendar } from "@productivity/ui";
import type { AllDayItem, CalendarItem } from "@productivity/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useOverview, useStoreAction, useWeek } from "./data.ts";
import { monthLabel, timeLabel, weekNumber, weekdayLabel } from "./format.ts";
import { useLookups } from "./lookups.ts";
import { useTaskDialog } from "./task-dialog.tsx";

/** The current time, refreshed every minute for the now line. */
const useNow = (): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return now;
};

const toDateTime = (day: LocalDate, minute: number): string =>
  toLocalDateTime(
    new Date(
      `${day}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`
    )
  );

const taskLists = [["next"], ["upcoming"], ["waiting"], ["someday"], ["inbox"]];

/** Finds a task already loaded by any list, to learn how long it takes. */
const useFindLoadedTask = () => {
  const client = useQueryClient();

  return (taskId: string): Task | undefined =>
    [
      ...taskLists.flatMap((key) => client.getQueryData<Task[]>(key) ?? []),
      ...client
        .getQueriesData<ProjectDetail | null>({ queryKey: ["project"] })
        .flatMap(([, detail]) => detail?.tasks ?? []),
    ].find((task) => task.id === taskId);
};

export const CalendarPane = () => {
  const now = useNow();
  const today = useOverview().data?.today ?? toLocalDate(now);
  const [anchor, setAnchor] = useState<LocalDate | null>(null);
  const day = anchor ?? today;
  const week = useWeek(day).data;
  const lookups = useLookups();
  const openTask = useTaskDialog();
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const findTask = useFindLoadedTask();

  const schedule = useStoreAction(
    (store, input: { taskId: string; start: string; end: string }) =>
      store.scheduleBlock(input.taskId, { end: input.end, start: input.start })
  );

  const days = week?.days ?? weekDays(day);

  const timed: CalendarItem[] = (week?.events ?? []).flatMap((event) =>
    event.allDay
      ? []
      : [
          {
            dayIndex: days.indexOf(datePart(event.start)),
            detail: `${timeLabel(event.start)} – ${timeLabel(event.end)}`,
            endMinute: minuteOfDay(event.end),
            id: event.id,
            kind: event.kind,
            startMinute: minuteOfDay(event.start),
            title: event.title,
          },
        ]
  );

  const blocks: CalendarItem[] = (week?.blocks ?? []).flatMap((task) =>
    task.block === null
      ? []
      : [
          {
            dayIndex: days.indexOf(datePart(task.block.start)),
            detail: [
              `${timeLabel(task.block.start)} – ${timeLabel(task.block.end)}`,
              lookups.project(task.projectId)?.name,
            ]
              .filter((part) => part !== undefined)
              .join(" · "),
            done: task.completedAt !== null,
            endMinute: minuteOfDay(task.block.end),
            id: task.id,
            kind: "task" as const,
            startMinute: minuteOfDay(task.block.start),
            title: task.title,
          },
        ]
  );

  const allDay: AllDayItem[] = (week?.events ?? []).flatMap((event) => {
    if (!event.allDay) {
      return [];
    }

    const start = Math.max(0, days.indexOf(datePart(event.start)));
    const endIndex = days.indexOf(datePart(event.end));

    return [
      {
        endIndex: endIndex === -1 ? days.length - 1 : endIndex,
        id: event.id,
        startIndex: start,
        title: event.title,
        tone:
          event.kind === "personal" ? ("pink" as const) : ("purple" as const),
      },
    ];
  });

  return (
    <WeekCalendar
      allDay={allDay}
      days={days.map((date) => ({
        dayNumber: Number(date.slice(8, 10)),
        isToday: date === today,
        key: date,
        weekday: weekdayLabel(date),
      }))}
      items={[...timed, ...blocks]}
      nowMinute={days.includes(today) ? nowMinute : null}
      onDropTask={(taskId, dayIndex, minute) => {
        const date = days[dayIndex];

        if (date === undefined) {
          return;
        }

        const minutes = findTask(taskId)?.minutes ?? 30;

        schedule.mutate({
          end: toDateTime(date, minute + minutes),
          start: toDateTime(date, minute),
          taskId,
        });
      }}
      onItemOpen={(id) => {
        const task = week?.blocks.find((block) => block.id === id);

        if (task !== undefined) {
          openTask(task);
        }
      }}
      onNext={() => {
        setAnchor(addDays(day, 7));
      }}
      onPrevious={() => {
        setAnchor(addDays(day, -7));
      }}
      onToday={() => {
        setAnchor(null);
      }}
      subtitle={`Week ${weekNumber(day)}`}
      title={monthLabel(days[0] ?? day)}
    />
  );
};
