import { Calendar as FullCalendar, formatDate } from "@fullcalendar/react";
import type {
  CalendarRef,
  DateClickInfo,
  DateSelectInfo,
  DayHeaderInfo,
  EventChangeInfo,
  EventClickInfo,
  EventDisplayInfo,
  EventInput,
} from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/react/interaction";
import themePlugin from "@fullcalendar/react/themes/breezy";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight, Square, SquareCheck } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { DragEvent, ReactNode } from "react";

import { color, font, space } from "../tokens.stylex.ts";
import { Button } from "./button.tsx";
import { IconButton } from "./icon-button.tsx";
import { taskDragType } from "./task-row.tsx";

/** Something on the calendar: an event, or a task placed in a time slot. */
export interface CalendarEntry {
  id: string;
  title: string;
  allDay: boolean;
  /** `YYYY-MM-DDTHH:mm`, or `YYYY-MM-DD` for all-day entries. */
  start: string;
  /** Exclusive, in the same format as start. */
  end: string;
  /** Tasks are drawn dashed, so they read as plans rather than appointments. */
  kind: "event" | "task";
  /** A CSS color for events. Tasks use the accent color. */
  color?: string;
  /** False keeps the entry from being dragged or resized. */
  editable: boolean;
  done?: boolean;
  /** Shown after the time, such as the task's project. */
  detail?: string;
}

/** A span of time on the calendar, in the same formats as an entry. */
export interface CalendarRange {
  start: string;
  end: string;
  allDay: boolean;
}

export interface WeekCalendarProps {
  title: string;
  subtitle?: string;
  /** Any day of the week to show, as `YYYY-MM-DD`. */
  date: string;
  entries: readonly CalendarEntry[];
  /** Extra controls in the header, such as a sync button. */
  actions?: ReactNode;
  /** The hour the grid scrolls to first. */
  firstHour?: number;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  /** The user clicked an empty slot or dragged across empty slots. */
  onSelectRange?: (range: CalendarRange) => void;
  onEntryOpen?: (id: string) => void;
  /**
   * The user moved or resized an entry. If the returned promise rejects,
   * the entry goes back where it was.
   */
  onEntryChange?: (id: string, range: CalendarRange) => Promise<void>;
  /** A task row was dropped on the grid, at a time snapped to 15 minutes. */
  onDropTask?: (taskId: string, start: string) => void;
}

const snapMinutes = 15;

/** One row per hour, like Google Calendar. Shorter times show in event heights. */
const slotMinutes = 60;

/**
 * Rows stretch to fill the pane, so the whole day shows without scrolling.
 * Below this height an hour row stops shrinking and the grid scrolls.
 */
const hourMinHeight = 20;

/** A click starts an event on the half hour under the pointer. */
const clickSnapMinutes = 30;

/** Entries this short or shorter always fit on one line, "Title, 9:00". */
const shortMinutes = 30;

/** Entries this short or shorter also use a smaller font, to fit their height. */
const tinyMinutes = 15;

/** A click on an empty slot proposes this long an event, like Google Calendar. */
const clickMinutes = 60;

const styles = stylex.create({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    height: "100%",
    minWidth: 0,
    overflow: "hidden",
    paddingBlock: 2,
    paddingInline: 4,
  },
  // One line, "Title, 9:00", for entries too short for two.
  contentShort: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingBlock: 0,
  },
  // The weekday sits above the number, so narrow columns still fit.
  dayHeader: {
    alignItems: "center",
    color: color.textSecondary,
    display: "flex",
    flexDirection: "column",
    fontSize: font.size11,
    gap: 2,
    paddingBlock: space.s1,
    textTransform: "uppercase",
    width: "100%",
  },
  dayNumber: {
    alignItems: "center",
    color: color.textPrimary,
    display: "inline-flex",
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
    height: 26,
    justifyContent: "center",
    minWidth: 26,
  },
  dayNumberToday: {
    backgroundColor: color.accent,
    borderRadius: 999,
    color: color.textOnAccent,
  },
  detail: {
    fontSize: font.size11,
    opacity: 0.85,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // The start time after a short entry's title.
  detailShort: { flexShrink: 0 },
  grid: {
    // The theme's colors, from the design tokens.
    "--fc-breezy-background": color.bgPage,
    "--fc-breezy-border": color.borderDefault,
    "--fc-breezy-foreground": color.textSecondary,
    "--fc-breezy-highlight": color.accentSubtle,
    "--fc-breezy-muted-border": color.borderDefault,
    "--fc-breezy-muted-foreground": color.textTertiary,
    "--fc-breezy-now": color.nowLine,
    "--fc-breezy-primary": color.accent,
    "--fc-breezy-primary-foreground": color.textOnAccent,
    "--fc-breezy-primary-over": color.accentHover,
    "--fc-breezy-strong-border": color.borderStrong,
    "--fc-breezy-strong-foreground": color.textPrimary,
    flexGrow: 1,
    fontFamily: font.family,
    fontSize: font.size12,
    minHeight: 0,
  },
  header: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    gap: space.s2,
    height: 52,
    paddingInline: space.s4,
  },
  headerSpacer: { flexGrow: 1 },
  root: {
    backgroundColor: color.bgPage,
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    height: "100%",
    minWidth: 0,
  },
  subtitle: { color: color.textTertiary, fontSize: font.size13 },
  task: {
    backgroundColor: color.bgPage,
    borderColor: color.accent,
    borderRadius: 4,
    borderStyle: "dashed",
    borderWidth: 1,
    color: color.textLink,
  },
  // Text small enough for a 15-minute entry.
  textTiny: {
    fontSize: font.size10,
    lineHeight: 1,
  },
  title: {
    color: color.textPrimary,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
    margin: 0,
  },
  titleLine: {
    alignItems: "center",
    display: "flex",
    fontSize: font.size12,
    fontWeight: font.weightSemibold,
    gap: 4,
    minWidth: 0,
    whiteSpace: "nowrap",
  },
  titleText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  // The comma in "Team standup, 9:00". It is drawn, not text, so the title
  // reads the same to screen readers and tests.
  titleTextShort: {
    "::after": { content: '","' },
  },
});

const pad = (value: number): string => String(value).padStart(2, "0");

const dayOf = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const timeOf = (date: Date): string =>
  `${dayOf(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60_000);

const rangeOf = (start: Date, end: Date, allDay: boolean): CalendarRange =>
  allDay
    ? { allDay, end: dayOf(end), start: dayOf(start) }
    : { allDay, end: timeOf(end), start: timeOf(start) };

/** The task's look, or the event's color for the theme to paint. */
const toEventInput = (entry: CalendarEntry): EventInput => ({
  allDay: entry.allDay,
  color: entry.kind === "task" ? "transparent" : entry.color,
  editable: entry.editable,
  end: entry.end,
  extendedProps: { entry },
  id: entry.id,
  start: entry.start,
  textColor: entry.kind === "task" ? undefined : color.textOnAccent,
  title: entry.title,
});

/** "9:00", the start of a short entry. */
const shortTimeFormat = {
  hour: "numeric",
  meridiem: false,
  minute: "2-digit",
} as const;

/**
 * How much room an entry has. Short entries fit on one line, and tiny ones
 * also use a smaller font.
 */
const sizeOf = (info: EventDisplayInfo, allDay: boolean) => {
  const { start, end } = info.event;

  if (allDay || start === null || end === null) {
    return { isShort: false, isTiny: false };
  }

  const minutes = (end.getTime() - start.getTime()) / 60_000;

  return {
    // FullCalendar also calls an entry short when its box is too low for two
    // lines, such as a 45-minute entry in a short window.
    isShort: info.isShort || minutes <= shortMinutes,
    isTiny: minutes <= tinyMinutes,
  };
};

/**
 * The line under the title: the times and the entry's detail. A short entry
 * shows only its start time, after the title, like Google Calendar's
 * "Team standup, 9:00".
 */
const detailOf = (
  info: EventDisplayInfo,
  entry: CalendarEntry | undefined,
  isShort: boolean
): string => {
  const { start } = info.event;

  if (isShort && start !== null) {
    return formatDate(start, shortTimeFormat);
  }

  return [info.timeText, entry?.detail]
    .filter((part) => part !== undefined && part !== "")
    .join(" · ");
};

const EntryContent = ({ info }: { info: EventDisplayInfo }) => {
  // SAFETY: events come from toEventInput, which stores the entry here. The
  // preview of a new selection has none.
  const entry = info.event.extendedProps.entry as CalendarEntry | undefined;
  const isTask = entry?.kind === "task";
  const allDay = entry?.allDay ?? info.event.allDay;
  const title = entry?.title ?? info.event.title;
  const { isShort, isTiny } = sizeOf(info, allDay);
  const detail = detailOf(info, entry, isShort);

  return (
    <div
      {...stylex.props(
        styles.content,
        isShort && styles.contentShort,
        isTask && styles.task
      )}
    >
      <span {...stylex.props(styles.titleLine, isTiny && styles.textTiny)}>
        {isTask &&
          (entry?.done === true ? (
            <SquareCheck aria-label="Done" size={11} />
          ) : (
            <Square aria-hidden size={11} />
          ))}
        <span
          {...stylex.props(
            styles.titleText,
            isShort && detail !== "" && styles.titleTextShort
          )}
        >
          {title === "" ? "(No title)" : title}
        </span>
      </span>
      {allDay || detail === "" ? null : (
        <span
          {...stylex.props(
            styles.detail,
            isShort && styles.detailShort,
            isTiny && styles.textTiny
          )}
        >
          {detail}
        </span>
      )}
    </div>
  );
};

const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });

/** "Mon 19", with today's number in a circle. */
const DayHeader = ({ info }: { info: DayHeaderInfo }) => (
  <span {...stylex.props(styles.dayHeader)}>
    <span>{weekdayFormat.format(info.date)}</span>
    <span
      {...stylex.props(styles.dayNumber, info.isToday && styles.dayNumberToday)}
    >
      {info.date.getDate()}
    </span>
  </span>
);

const renderEntry = (info: EventDisplayInfo) => <EntryContent info={info} />;

const renderDayHeader = (info: DayHeaderInfo) => <DayHeader info={info} />;

/** The time under the pointer, from the grid's own slot and day elements. */
const timeAtPoint = (
  root: HTMLElement,
  x: number,
  y: number
): string | null => {
  const contains = (element: Element) => {
    const box = element.getBoundingClientRect();

    return x >= box.left && x < box.right && y >= box.top && y < box.bottom;
  };

  const day = [...root.querySelectorAll<HTMLElement>("[data-date]")].find(
    (element) => element.closest("[data-time]") === null && contains(element)
  );

  const slot = [...root.querySelectorAll<HTMLElement>("[data-time]")].find(
    (element) => {
      const box = element.getBoundingClientRect();

      return y >= box.top && y < box.bottom;
    }
  );

  const date = day?.dataset.date;
  const time = slot?.dataset.time;

  if (slot === undefined || date === undefined || time === undefined) {
    return null;
  }

  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const box = slot.getBoundingClientRect();
  const offset = ((y - box.top) / box.height) * slotMinutes;

  const minute =
    Math.round((hours * 60 + minutes + offset) / snapMinutes) * snapMinutes;

  return `${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
};

/**
 * A week of days with a time grid, built on FullCalendar. Click or drag on
 * empty slots to propose an event; drag entries to move them, or their
 * bottom edge to change their length.
 */
export const WeekCalendar = (props: WeekCalendarProps) => {
  const { title, subtitle, date, entries, actions, firstHour = 7 } = props;
  const calendar = useRef<CalendarRef>(null);
  const grid = useRef<HTMLDivElement>(null);

  // FullCalendar re-renders when an option changes identity, so its
  // callbacks are made once and read the latest props through this ref.
  const latest = useRef(props);

  useLayoutEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    calendar.current?.getApi().gotoDate(date);
  }, [date]);

  const events = useMemo(() => entries.map(toEventInput), [entries]);

  const handlers = useMemo(() => {
    const change = (info: EventChangeInfo): void => {
      const { start, end, allDay, id } = info.event;

      if (start === null) {
        info.revert();

        return;
      }

      const until = end ?? addMinutes(start, allDay ? 24 * 60 : clickMinutes);

      latest.current
        .onEntryChange?.(id, rangeOf(start, until, allDay))
        .catch(() => {
          info.revert();
        });
    };

    return {
      dateClick: (info: DateClickInfo) => {
        // A click means the half hour under the pointer, not the quarter.
        const start = new Date(info.date);

        start.setMinutes(
          Math.floor(start.getMinutes() / clickSnapMinutes) * clickSnapMinutes
        );
        latest.current.onSelectRange?.(
          rangeOf(
            start,
            addMinutes(start, info.allDay ? 24 * 60 : clickMinutes),
            info.allDay
          )
        );
      },
      dayHeaderContent: renderDayHeader,
      eventClick: (info: EventClickInfo) => {
        info.jsEvent.preventDefault();
        latest.current.onEntryOpen?.(info.event.id);
      },
      eventContent: renderEntry,
      eventDrop: change,
      eventResize: change,
      select: (info: DateSelectInfo) => {
        calendar.current?.getApi().unselect();
        latest.current.onSelectRange?.(
          rangeOf(info.start, info.end, info.allDay)
        );
      },
    };
  }, []);

  const acceptDrag = (event: DragEvent<HTMLDivElement>): void => {
    if (
      props.onDropTask !== undefined &&
      event.dataTransfer.types.includes(taskDragType)
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };

  const drop = (event: DragEvent<HTMLDivElement>): void => {
    const taskId = event.dataTransfer.getData(taskDragType);

    const start =
      grid.current === null
        ? null
        : timeAtPoint(grid.current, event.clientX, event.clientY);

    if (props.onDropTask === undefined || taskId === "" || start === null) {
      return;
    }

    event.preventDefault();
    props.onDropTask(taskId, start);
  };

  return (
    <section aria-label="Calendar" {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <h2 {...stylex.props(styles.title)}>{title}</h2>
        {subtitle === undefined ? null : (
          <span {...stylex.props(styles.subtitle)}>{subtitle}</span>
        )}
        <span {...stylex.props(styles.headerSpacer)} />
        {actions}
        <Button onClick={props.onToday} size="small" variant="outline">
          Today
        </Button>
        <IconButton
          icon={<ChevronLeft size={16} />}
          label="Previous week"
          onClick={props.onPrevious}
        />
        <IconButton
          icon={<ChevronRight size={16} />}
          label="Next week"
          onClick={props.onNext}
        />
      </div>

      {/* Dropping task rows is a mouse shortcut; the task dialog schedules by keyboard. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        onDragOver={acceptDrag}
        onDrop={drop}
        ref={grid}
        {...stylex.props(styles.grid)}
      >
        <FullCalendar
          allDayText="all-day"
          borderlessBottom
          borderlessX
          dateClick={handlers.dateClick}
          columnEventClass="week-calendar-event"
          columnEventInnerClass="week-calendar-event-inner"
          dayHeaderContent={handlers.dayHeaderContent}
          editable
          eventClick={handlers.eventClick}
          eventContent={handlers.eventContent}
          eventDrop={handlers.eventDrop}
          eventResize={handlers.eventResize}
          events={events}
          expandRows
          firstDay={1}
          headerToolbar={false}
          height="100%"
          initialDate={date}
          initialView="timeGridWeek"
          nowIndicator
          plugins={[themePlugin, timeGridPlugin, interactionPlugin]}
          ref={calendar}
          scrollTime={`${pad(firstHour)}:00:00`}
          select={handlers.select}
          selectMinDistance={5}
          selectMirror
          selectable
          slotDuration={{ minutes: slotMinutes }}
          slotHeaderInnerClass="week-calendar-hour-label"
          slotMinHeight={hourMinHeight}
          snapDuration={{ minutes: snapMinutes }}
        />
      </div>
    </section>
  );
};
