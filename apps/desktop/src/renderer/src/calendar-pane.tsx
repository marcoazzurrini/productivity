import { addDays, toLocalDate, weekDays } from "@productivity/gtd";
import type { LocalDate, ProjectDetail, Task } from "@productivity/gtd";
import { useToast, WeekCalendar } from "@productivity/ui";
import type { CalendarEntry, CalendarRange } from "@productivity/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  errorText,
  useCalendarAction,
  useEvents,
  useOverview,
  useStoreAction,
  useWeek,
} from "./data.ts";
import { EventDialog } from "./event-dialog.tsx";
import type { EventDialogTarget } from "./event-dialog.tsx";
import { monthLabel, weekNumber } from "./format.ts";
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

/** Entries carry their source in the ID, so a click knows what it opened. */
const eventPrefix = "event:";
const taskPrefix = "task:";

export const CalendarPane = () => {
  const toast = useToast();
  // Until the overview loads, today is the day the pane opened.
  const [openedOn, setOpenedOn] = useState(() => toLocalDate(new Date()));
  const today = useOverview().data?.today ?? openedOn;
  const [anchor, setAnchor] = useState<LocalDate | null>(null);
  const [dialog, setDialog] = useState<EventDialogTarget | null>(null);
  const day = anchor ?? today;
  const days = weekDays(day);
  const monday = days[0] ?? day;
  const blocks = useWeek(day).data?.blocks;
  const events = useEvents(monday, addDays(monday, 7)).data;
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
      ...(blocks ?? []).flatMap((task) =>
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
            const task = blocks?.find(
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
          setAnchor(addDays(day, 7));
        }}
        onPrevious={() => {
          setAnchor(addDays(day, -7));
        }}
        onSelectRange={(range) => {
          setDialog({ kind: "create", range });
        }}
        onToday={() => {
          setAnchor(null);
          setOpenedOn(toLocalDate(new Date()));
        }}
        subtitle={`Week ${weekNumber(day)}`}
        title={monthLabel(monday)}
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
