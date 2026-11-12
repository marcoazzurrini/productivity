import { Calendar as FullCalendar, formatDate } from "@fullcalendar/react";
import type {
  CalendarRef,
  DateClickInfo,
  DateSelectInfo,
  DayHeaderInfo,
  DayLaneInfo,
  EventChangeInfo,
  EventClickInfo,
  EventDisplayInfo,
  EventInput,
  SlotHeaderInfo,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import themePlugin from "@fullcalendar/react/themes/breezy";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import * as stylex from "@stylexjs/stylex";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { DragEvent, ReactNode } from "react";

import { color, font, tag } from "../tokens.stylex.ts";
import { Button } from "./button.tsx";
import { IconButton } from "./icon-button.tsx";
import { SegmentedControl } from "./segmented-control.tsx";
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
  /** Tasks are drawn outlined, so they read as plans rather than appointments. */
  kind: "event" | "task";
  /**
   * A CSS color for events. It paints the bar at the entry's left edge, and
   * a light tint of it fills the entry. Tasks use the accent color.
   */
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

/** How much time the calendar shows at once. */
export type CalendarView = "day" | "week" | "month";

export interface WeekCalendarProps {
  title: string;
  subtitle?: string;
  /** Any day of the day, week or month to show, as `YYYY-MM-DD`. */
  date: string;
  /** Defaults to the week. */
  view?: CalendarView;
  /** Shows the Day / Week / Month switch, and is called when it changes. */
  onViewChange?: (view: CalendarView) => void;
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

/** FullCalendar's name for each view. */
const viewNames = {
  day: "timeGridDay",
  month: "dayGridMonth",
  week: "timeGridWeek",
} as const satisfies Record<CalendarView, string>;

const viewOptions = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
] as const;

const isView = (value: string): value is CalendarView => value in viewNames;

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
  // The square before a task's title. It is drawn, so it can sit on one
  // text line at any size.
  checkbox: {
    alignItems: "center",
    borderColor: color.accent,
    borderRadius: 3,
    borderStyle: "solid",
    borderWidth: 1.25,
    color: color.textOnAccent,
    display: "flex",
    flexShrink: 0,
    height: 11,
    justifyContent: "center",
    width: 11,
  },
  checkboxDone: { backgroundColor: color.accent },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    height: "100%",
    minWidth: 0,
    overflow: "hidden",
    paddingBlock: 4,
    paddingInlineEnd: 6,
    paddingInlineStart: 8,
  },
  // One line for a whole day: the title alone, centered in its bar.
  contentAllDay: {
    alignItems: "center",
    flexDirection: "row",
    paddingBlock: 0,
    paddingInline: 8,
  },
  // One line, "Title, 9:00", for entries too short for two.
  contentShort: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingBlock: 0,
  },
  // The weekday sits before the number, as in "Mon 20".
  dayHeader: {
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    fontSize: font.size13,
    fontWeight: font.weightMedium,
    gap: 8,
  },
  dayHeaderToday: { color: color.accent },
  dayNumber: {
    alignItems: "center",
    borderRadius: 999,
    color: color.textPrimary,
    display: "inline-flex",
    fontSize: font.size18,
    fontWeight: font.weightMedium,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  dayNumberToday: {
    backgroundColor: color.accent,
    color: color.textOnAccent,
    fontWeight: font.weightSemibold,
  },
  dayNumberWeekend: { color: color.textTertiary },
  detail: {
    color: color.textSecondary,
    fontSize: font.size11,
    lineHeight: "14px",
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
    "--fc-breezy-event": color.accent,
    "--fc-breezy-foreground": color.textSecondary,
    "--fc-breezy-highlight": color.accentSubtle,
    "--fc-breezy-muted-border": color.borderDefault,
    "--fc-breezy-muted-foreground": color.textTertiary,
    "--fc-breezy-now": tag.redFg,
    "--fc-breezy-primary": color.accent,
    "--fc-breezy-primary-foreground": color.textOnAccent,
    "--fc-breezy-primary-over": color.accentHover,
    "--fc-breezy-strong-border": color.borderStrong,
    "--fc-breezy-strong-foreground": color.textPrimary,
    // Tokens for the calendar's own rules in base.css.
    "--week-calendar-accent": color.accent,
    "--week-calendar-page": color.bgPage,
    "--week-calendar-text": color.textPrimary,
    "--week-calendar-text-tertiary": color.textTertiary,
    flexGrow: 1,
    fontFamily: font.family,
    fontSize: font.size12,
    minHeight: 0,
    position: "relative",
  },
  header: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    gap: 10,
    height: 56,
    paddingInline: 20,
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
  // Text small enough for a 15-minute entry.
  textTiny: {
    fontSize: font.size10,
    lineHeight: 1,
  },
  // The time zone, in the corner above the hour labels.
  timeZone: {
    alignItems: "flex-end",
    color: color.textTertiary,
    display: "flex",
    fontSize: font.size10,
    height: 56,
    insetBlockStart: 0,
    insetInlineStart: 0,
    justifyContent: "flex-end",
    paddingBottom: 6,
    paddingInlineEnd: 8,
    pointerEvents: "none",
    position: "absolute",
    width: 64,
    zIndex: 1,
  },
  title: {
    color: color.textPrimary,
    fontSize: font.size18,
    fontWeight: font.weightSemibold,
    letterSpacing: "-0.2px",
    margin: 0,
  },
  titleLine: {
    alignItems: "center",
    color: color.textPrimary,
    display: "flex",
    fontSize: font.size12,
    fontWeight: font.weightSemibold,
    gap: 5,
    lineHeight: "16px",
    minWidth: 0,
    whiteSpace: "nowrap",
  },
  // A whole-day entry takes the color its bar sets in base.css.
  titleLineAllDay: { color: "inherit", fontWeight: font.weightMedium },
  titleLineTask: { color: color.textLink },
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

/** The entry's color, for the theme to hand to the rules in base.css. */
const toEventInput = (entry: CalendarEntry): EventInput => ({
  allDay: entry.allDay,
  color: entry.kind === "task" ? undefined : entry.color,
  editable: entry.editable,
  end: entry.end,
  extendedProps: { entry },
  id: entry.id,
  start: entry.start,
  title: entry.title,
});

/** The entry an event was made from. The preview of a new selection has none. */
const entryOf = (info: EventDisplayInfo): CalendarEntry | undefined =>
  // SAFETY: events come from toEventInput, which stores the entry here.
  info.event.extendedProps.entry as CalendarEntry | undefined;

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

  // The month shows every entry as one line in its day's cell.
  if (info.view.type === viewNames.month) {
    return { isShort: true, isTiny: false };
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

/** The square before a task's title, filled once the task is done. */
const TaskCheckbox = ({ done }: { done: boolean }) =>
  done ? (
    <span {...stylex.props(styles.checkbox, styles.checkboxDone)}>
      <Check aria-label="Done" size={8} strokeWidth={3.5} />
    </span>
  ) : (
    <span aria-hidden {...stylex.props(styles.checkbox)} />
  );

const EntryContent = ({ info }: { info: EventDisplayInfo }) => {
  const entry = entryOf(info);
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
        allDay && styles.contentAllDay
      )}
    >
      <span
        {...stylex.props(
          styles.titleLine,
          allDay && styles.titleLineAllDay,
          isTask && styles.titleLineTask,
          isTiny && styles.textTiny
        )}
      >
        {isTask ? <TaskCheckbox done={entry.done === true} /> : null}
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

const weekdayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short" });

/**
 * "Mon 20", with today's number in a filled circle and the weekend's
 * numbers quieter. The month has one header per weekday, so no number.
 */
const DayHeader = ({ info }: { info: DayHeaderInfo }) => {
  // The list of entries that did not fit a day opens with the day's date.
  if (info.inPopover) {
    return <span {...stylex.props(styles.dayHeader)}>{info.text}</span>;
  }

  const hasNumber = info.dayNumberText !== "";
  const isToday = hasNumber && info.isToday;
  const weekday = info.date.getDay();

  return (
    <span {...stylex.props(styles.dayHeader, isToday && styles.dayHeaderToday)}>
      <span>{weekdayFormat.format(info.date)}</span>
      {hasNumber ? (
        <span
          {...stylex.props(
            styles.dayNumber,
            (weekday === 0 || weekday === 6) && styles.dayNumberWeekend,
            isToday && styles.dayNumberToday
          )}
        >
          {info.date.getDate()}
        </span>
      ) : null}
    </span>
  );
};

const renderEntry = (info: EventDisplayInfo) => <EntryContent info={info} />;

const renderDayHeader = (info: DayHeaderInfo) => <DayHeader info={info} />;

const hourMs = 3_600_000;

/** "1 AM". Midnight has no label: its line is the top of the grid. */
const renderHour = (info: SlotHeaderInfo): string => {
  const hour = Math.round((info.time?.milliseconds ?? 0) / hourMs);

  if (hour === 0) {
    return "";
  }

  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? "AM" : "PM"}`;
};

/**
 * Class names for the rules in base.css. FullCalendar adds them to the
 * theme's own, and they are made once so the grid does not render again.
 */
const classes = {
  allDayDivider: "week-calendar-all-day-divider",
  allDayLabel: "week-calendar-all-day-label",
  columnEvent: (info: EventDisplayInfo): string =>
    entryOf(info)?.kind === "task"
      ? "week-calendar-event week-calendar-task"
      : "week-calendar-event",
  dayCell: "week-calendar-day-cell",
  dayCellBottom: "week-calendar-day-cell-bottom",
  dayCellTop: "week-calendar-day-cell-top",
  dayHeader: "week-calendar-day-header",
  dayHeaderCell: "week-calendar-day-header-cell",
  dayLane: (info: DayLaneInfo): string | false =>
    info.isToday && "week-calendar-today",
  eventInner: "week-calendar-event-inner",
  hourLabel: "week-calendar-hour-label",
  nowDot: "week-calendar-now-dot",
  nowLine: "week-calendar-now-line",
  rowEvent: (info: EventDisplayInfo): string =>
    entryOf(info)?.kind === "task"
      ? "week-calendar-row-event week-calendar-task"
      : "week-calendar-row-event",
};

/** Made once: FullCalendar renders again when its plugin list changes. */
const plugins = [themePlugin, timeGridPlugin, dayGridPlugin, interactionPlugin];

/** "GMT+1", the computer's offset from UTC on a day. */
const timeZoneLabel = (date: string): string => {
  const minutes = -new Date(`${date}T12:00`).getTimezoneOffset();

  if (minutes === 0) {
    return "GMT";
  }

  const hours = Math.floor(Math.abs(minutes) / 60);
  const rest = Math.abs(minutes) % 60;

  return `GMT${minutes < 0 ? "-" : "+"}${hours}${rest === 0 ? "" : `:${pad(rest)}`}`;
};

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
 * A day, a week or a month of entries, built on FullCalendar. The day and
 * the week have a time grid: click or drag on empty slots to propose an
 * event, drag entries to move them, or their bottom edge to change their
 * length. The month shows each day's entries as a list.
 */
export const WeekCalendar = (props: WeekCalendarProps) => {
  const {
    title,
    subtitle,
    date,
    view = "week",
    entries,
    actions,
    firstHour = 7,
  } = props;

  const calendar = useRef<CalendarRef>(null);
  const grid = useRef<HTMLDivElement>(null);

  // FullCalendar re-renders when an option changes identity, so its
  // callbacks are made once and read the latest props through this ref.
  const latest = useRef(props);

  useLayoutEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    calendar.current?.getApi().changeView(viewNames[view], date);
  }, [date, view]);

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
      eventClick: (info: EventClickInfo) => {
        info.jsEvent.preventDefault();
        latest.current.onEntryOpen?.(info.event.id);
      },
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

  const gridProps = stylex.props(styles.grid);

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
          icon={<ChevronLeft size={18} />}
          label={`Previous ${view}`}
          onClick={props.onPrevious}
        />
        <IconButton
          icon={<ChevronRight size={18} />}
          label={`Next ${view}`}
          onClick={props.onNext}
        />
        {props.onViewChange === undefined ? null : (
          <SegmentedControl
            label="View"
            onValueChange={(next) => {
              if (isView(next)) {
                props.onViewChange?.(next);
              }
            }}
            options={viewOptions}
            value={view}
          />
        )}
      </div>

      {/* Dropping task rows is a mouse shortcut; the task dialog schedules by keyboard. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        {...gridProps}
        // The rules in base.css hang on this class, and differ by view.
        className={`${gridProps.className ?? ""} week-calendar`}
        data-view={view}
        onDragOver={acceptDrag}
        onDrop={drop}
        ref={grid}
      >
        {view === "month" ? null : (
          <span aria-hidden {...stylex.props(styles.timeZone)}>
            {timeZoneLabel(date)}
          </span>
        )}
        <FullCalendar
          allDayDividerClass={classes.allDayDivider}
          allDayHeaderInnerClass={classes.allDayLabel}
          allDayText="all-day"
          borderlessBottom
          borderlessTop
          borderlessX
          columnEventClass={classes.columnEvent}
          columnEventInnerClass={classes.eventInner}
          dateClick={handlers.dateClick}
          dayCellBottomClass={classes.dayCellBottom}
          dayCellClass={classes.dayCell}
          dayCellTopClass={classes.dayCellTop}
          dayHeaderAlign="start"
          dayHeaderClass={classes.dayHeaderCell}
          dayHeaderContent={renderDayHeader}
          dayHeaderInnerClass={classes.dayHeader}
          dayLaneClass={classes.dayLane}
          dayMaxEvents
          editable
          eventClick={handlers.eventClick}
          eventContent={renderEntry}
          eventDisplay="block"
          eventDrop={handlers.eventDrop}
          eventResize={handlers.eventResize}
          events={events}
          expandRows
          firstDay={1}
          headerToolbar={false}
          height="100%"
          initialDate={date}
          initialView={viewNames[view]}
          nowIndicator
          nowIndicatorDotClass={classes.nowDot}
          nowIndicatorLineClass={classes.nowLine}
          plugins={plugins}
          ref={calendar}
          rowEventClass={classes.rowEvent}
          rowEventInnerClass={classes.eventInner}
          scrollTime={`${pad(firstHour)}:00:00`}
          select={handlers.select}
          selectMinDistance={5}
          selectMirror
          selectable
          slotDuration={{ minutes: slotMinutes }}
          slotHeaderContent={renderHour}
          slotHeaderInnerClass={classes.hourLabel}
          slotMinHeight={hourMinHeight}
          snapDuration={{ minutes: snapMinutes }}
        />
      </div>
    </section>
  );
};
