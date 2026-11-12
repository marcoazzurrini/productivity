import {
  addDays,
  parseLocalDate,
  startOfWeek,
  toLocalDate,
} from "@productivity/gtd";
import type { LocalDate, ProjectDetail, Task } from "@productivity/gtd";
import { useToast, WeekCalendar } from "@productivity/ui";
import type {
  CalendarEntry,
  CalendarRange,
  CalendarView,
} from "@productivity/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  errorText,
  useBlocks,
  useCalendarAction,
  useEvents,
  useOverview,
  useStoreAction,
} from "./data.ts";
import { EventDialog } from "./event-dialog.tsx";
import type { EventDialogTarget } from "./event-dialog.tsx";
import { monthLabel, shortDate, weekNumber } from "./format.ts";
import { GoogleSync } from "./google-sync.tsx";
import { useLookups } from "./lookups.ts";
import { useTaskDialog } from "./task-dialog.tsx";

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

const pad = (value: number): string => String(value).padStart(2, "0");

const addMinutes = (start: string, minutes: number): string => {
  const date = new Date(`${start}:00`);

  date.setMinutes(date.getMinutes() + minutes);

  return `${toLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const firstOfMonth = (day: LocalDate): LocalDate => `${day.slice(0, 8)}01`;

/** The month's grid always shows six weeks, like a wall calendar. */
const monthGridDays = 42;

/** The days a view shows around a day: from the first, up to but not including the last. */
const shownDays = (view: CalendarView, day: LocalDate) => {
  if (view === "day") {
    return { from: day, to: addDays(day, 1) };
  }

  if (view === "week") {
    const monday = startOfWeek(day);

    return { from: monday, to: addDays(monday, 7) };
  }

  const from = startOfWeek(firstOfMonth(day));

  return { from, to: addDays(from, monthGridDays) };
};

/** The Monday of every week that has a day in [from, to). */
const mondaysIn = (from: LocalDate, to: LocalDate): LocalDate[] => {
  const mondays: LocalDate[] = [];

  for (
    let monday = startOfWeek(from);
    monday < to;
    monday = addDays(monday, 7)
  ) {
    mondays.push(monday);
  }

  return mondays;
};

/** The day to show after stepping one day, week or month. */
const stepFrom = (
  view: CalendarView,
  day: LocalDate,
  direction: 1 | -1
): LocalDate => {
  if (view === "day") {
    return addDays(day, direction);
  }

  if (view === "week") {
    return addDays(day, 7 * direction);
  }

  // The first of the month, so a step from the 31st never skips a month.
  const first = parseLocalDate(firstOfMonth(day));

  first.setMonth(first.getMonth() + direction);

  return toLocalDate(first);
};

/** Entries carry their source in the ID, so a click knows what it opened. */
const eventPrefix = "event:";
const taskPrefix = "task:";

/** "Thursday" and "Oct 23", for the one-day view's header. */
const weekdayLong = new Intl.DateTimeFormat("en-US", { weekday: "long" });

/** The week, or with the agent open, one day. */
export const CalendarPane = ({ days: shown = 7 }: { days?: 1 | 7 }) => {
  const toast = useToast();
  // Until the overview loads, today is the day the pane opened.
  const [openedOn, setOpenedOn] = useState(() => toLocalDate(new Date()));
  const today = useOverview().data?.today ?? openedOn;
  const [anchor, setAnchor] = useState<LocalDate | null>(null);
  const [dialog, setDialog] = useState<EventDialogTarget | null>(null);
  const [chosenView, setChosenView] = useState<CalendarView>("week");
  const oneDay = shown === 1;
  const view = oneDay ? "day" : chosenView;
  const day = anchor ?? today;
  const { from, to } = shownDays(view, day);
  const mondays = useMemo(() => mondaysIn(from, to), [from, to]);
  const blocks = useBlocks(mondays);
  const events = useEvents(from, to).data;
  const lookups = useLookups();
  const openTask = useTaskDialog();
  const findTask = useFindLoadedTask();

  const onError = (error: Error): void => {
    toast({ title: errorText(error) });
  };

  const schedule = useStoreAction(
    (store, input: { taskId: string; start: string; end: string }) =>
      store.scheduleBlock(input.taskId, { end: input.end, start: input.start })
  );

  const moveEvent = useCalendarAction(
    (calendar, input: { id: string; range: CalendarRange }) =>
      calendar.updateEvent(input.id, input.range)
  );

  const entries = useMemo<CalendarEntry[]>(
    () => [
      ...(events ?? []).map((event) => ({
        allDay: event.allDay,
        color: event.color,
        editable: event.editable,
        end: event.end,
        id: `${eventPrefix}${event.id}`,
        kind: "event" as const,
        start: event.start,
        title: event.title,
      })),
      ...blocks.flatMap((task) =>
        task.block === null
          ? []
          : [
              {
                allDay: false,
                detail: lookups.project(task.projectId)?.name,
                done: task.completedAt !== null,
                editable: true,
                end: task.block.end,
                id: `${taskPrefix}${task.id}`,
                kind: "task" as const,
                start: task.block.start,
                title: task.title,
              },
            ]
      ),
    ],
    [blocks, events, lookups]
  );

  const changeEntry = async (
    id: string,
    range: CalendarRange
  ): Promise<void> => {
    if (id.startsWith(eventPrefix)) {
      await moveEvent.mutateAsync(
        { id: id.slice(eventPrefix.length), range },
        { onError }
      );

      return;
    }

    // A time block needs a time: a task dragged to all-day goes back.
    if (range.allDay) {
      throw new Error("Time blocks need a time.");
    }

    await schedule.mutateAsync(
      {
        end: range.end,
        start: range.start,
        taskId: id.slice(taskPrefix.length),
      },
      { onError }
    );
  };

  // One day names itself: "Thursday", "Oct 23". A month spans several
  // weeks, so only the week names its number. The month's grid starts in
  // the month before, so it is named for the day it was opened for.
  const title =
    view === "day"
      ? weekdayLong.format(parseLocalDate(day))
      : monthLabel(view === "week" ? from : day);

  const subtitles = {
    day: shortDate(day),
    month: undefined,
    week: `Week ${weekNumber(day)}`,
  };

  const subtitle = subtitles[view];

  return (
    <>
      <WeekCalendar
        actions={<GoogleSync />}
        date={day}
        entries={entries}
        onDropTask={(taskId, start) => {
          const minutes = findTask(taskId)?.minutes ?? 30;

          schedule.mutate(
            { end: addMinutes(start, minutes), start, taskId },
            { onError }
          );
        }}
        onEntryChange={changeEntry}
        onEntryOpen={(id) => {
          if (id.startsWith(taskPrefix)) {
            const task = blocks.find(
              (block) => block.id === id.slice(taskPrefix.length)
            );

            if (task !== undefined) {
              openTask(task);
            }

            return;
          }

          const event = events?.find(
            (each) => each.id === id.slice(eventPrefix.length)
          );

          if (event !== undefined) {
            setDialog({ event, kind: "edit" });
          }
        }}
        onNext={() => {
          setAnchor(stepFrom(view, day, 1));
        }}
        onPrevious={() => {
          setAnchor(stepFrom(view, day, -1));
        }}
        onSelectRange={(range) => {
          setDialog({ kind: "create", range });
        }}
        onToday={() => {
          setAnchor(null);
          setOpenedOn(toLocalDate(new Date()));
        }}
        // With the agent open the pane is one day wide, so the switch to
        // other views is put away.
        onViewChange={oneDay ? undefined : setChosenView}
        subtitle={subtitle}
        title={title}
        view={view}
      />
      {dialog === null ? null : (
        <EventDialog
          onClose={() => {
            setDialog(null);
          }}
          target={dialog}
        />
      )}
    </>
  );
};
