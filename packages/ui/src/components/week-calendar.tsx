import * as stylex from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight, Square, SquareCheck } from "lucide-react";
import type { DragEvent } from "react";

import { color, font, radius, space, tag } from "../tokens.stylex.ts";
import { Button } from "./button.tsx";
import { IconButton } from "./icon-button.tsx";
import { taskDragType } from "./task-row.tsx";
import { toneStyles } from "./tone.ts";
import type { Tone } from "./tone.ts";
import { VisuallyHidden } from "./visually-hidden.tsx";

export interface CalendarDay {
  key: string;
  /** Short weekday name: "Mon". */
  weekday: string;
  dayNumber: number;
  isToday: boolean;
}

export type CalendarItemKind = "meeting" | "focus" | "personal" | "task";

export interface CalendarItem {
  id: string;
  /** 0 for the first day shown, 6 for the last. */
  dayIndex: number;
  /** Minutes since midnight. */
  startMinute: number;
  endMinute: number;
  title: string;
  /** "10:00 – 11:00 · Q4 Planning". Hidden on items too short to fit it. */
  detail?: string;
  /** Tasks are drawn dashed so they read as plans, not appointments. */
  kind: CalendarItemKind;
  done?: boolean;
}

export interface AllDayItem {
  id: string;
  title: string;
  startIndex: number;
  endIndex: number;
  tone: Tone;
}

export interface WeekCalendarProps {
  title: string;
  subtitle?: string;
  days: readonly CalendarDay[];
  allDay?: readonly AllDayItem[];
  items: readonly CalendarItem[];
  /** The current time in minutes since midnight, drawn in today's column. */
  nowMinute?: number | null;
  firstHour?: number;
  lastHour?: number;
  hourHeight?: number;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onItemOpen?: (id: string) => void;
  /** Called when a dragged task row is dropped, snapped to 15 minutes. */
  onDropTask?: (taskId: string, dayIndex: number, minute: number) => void;
}

const gutter = 64;
const noAllDayItems: readonly AllDayItem[] = [];
const snapMinutes = 15;

const styles = stylex.create({
  allDay: {
    borderBottomColor: color.borderDefault,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    display: "grid",
    gap: 2,
    gridAutoRows: 20,
    paddingBlock: space.s1,
  },
  allDayItem: {
    alignItems: "center",
    borderRadius: radius.sm,
    display: "flex",
    fontSize: font.size11,
    fontWeight: font.weightMedium,
    marginInline: 2,
    overflow: "hidden",
    paddingInline: 6,
    whiteSpace: "nowrap",
  },
  allDayLabel: {
    alignSelf: "center",
    color: color.textTertiary,
    fontSize: 10,
    gridColumn: 1,
    gridRow: 1,
    paddingInlineStart: space.s2,
  },
  column: {
    borderInlineStartColor: color.borderDefault,
    borderInlineStartStyle: "solid",
    borderInlineStartWidth: 1,
    listStyle: "none",
    margin: 0,
    padding: 0,
    position: "relative",
  },
  columnToday: { backgroundColor: color.bgToday },
  dayHeader: {
    alignItems: "baseline",
    color: color.textSecondary,
    display: "flex",
    fontSize: font.size12,
    gap: 6,
    paddingBlock: space.s3,
    paddingInline: space.s2,
  },
  dayHeaders: {
    display: "grid",
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
    borderRadius: radius.full,
    color: color.textOnAccent,
  },
  detail: {
    color: color.textSecondary,
    fontSize: font.size11,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  focus: {
    backgroundColor: tag.purpleBg,
    borderInlineStartColor: tag.purpleFg,
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: space.s2,
    height: 52,
    paddingInline: space.s4,
  },
  headerSpacer: { flexGrow: 1 },
  hourLabel: {
    color: color.textTertiary,
    fontSize: 10,
    paddingInlineEnd: space.s2,
    position: "absolute",
    right: 0,
    transform: "translateY(-50%)",
  },
  hourLine: {
    borderTopColor: color.borderDefault,
    borderTopStyle: "solid",
    borderTopWidth: 1,
    left: gutter,
    position: "absolute",
    right: 0,
  },
  item: {
    backgroundColor: color.accentSubtle,
    borderInlineStartColor: tag.blueFg,
    borderInlineStartStyle: "solid",
    borderInlineStartWidth: 3,
    borderRadius: radius.sm,
    boxSizing: "border-box",
    color: color.textPrimary,
    cursor: "default",
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    gap: 1,
    overflow: "hidden",
    paddingBlock: 3,
    paddingInline: 6,
    position: "absolute",
    textAlign: "start",
  },
  itemButton: {
    backgroundColor: "transparent",
    borderStyle: "none",
    color: "inherit",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 1,
    height: "100%",
    padding: 0,
    textAlign: "start",
    width: "100%",
  },
  itemTitle: {
    alignItems: "center",
    display: "flex",
    fontSize: font.size12,
    fontWeight: font.weightSemibold,
    gap: 4,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  meeting: {},
  now: {
    backgroundColor: color.nowLine,
    height: 2,
    left: -4,
    position: "absolute",
    right: 0,
    zIndex: 2,
  },
  nowDot: {
    backgroundColor: color.nowLine,
    borderRadius: radius.full,
    height: 8,
    left: 0,
    position: "absolute",
    top: -3,
    width: 8,
  },
  personal: {
    backgroundColor: tag.greenBg,
    borderInlineStartColor: tag.greenFg,
  },
  root: {
    backgroundColor: color.bgPage,
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    height: "100%",
    minWidth: 0,
  },
  scroll: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: "auto",
  },
  subtitle: { color: color.textTertiary, fontSize: font.size13 },
  task: {
    backgroundColor: color.bgPage,
    borderColor: color.accent,
    borderStyle: "dashed",
    borderWidth: 1,
    color: color.textLink,
  },
  timeline: {
    display: "grid",
    position: "relative",
  },
  title: {
    color: color.textPrimary,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
    margin: 0,
  },
  weekday: { fontSize: font.size12 },
});

const kindStyle = {
  focus: styles.focus,
  meeting: styles.meeting,
  personal: styles.personal,
  task: styles.task,
} as const;

interface PlacedItem extends CalendarItem {
  lane: number;
  lanes: number;
}

/** Side-by-side lanes for items that overlap on the same day. */
const placeItems = (
  items: readonly CalendarItem[],
  dayCount: number
): PlacedItem[][] =>
  Array.from({ length: dayCount }, (_, dayIndex) => {
    const placed: PlacedItem[] = [];
    const dayItems = items.filter((item) => item.dayIndex === dayIndex);
    const sorted = dayItems.toSorted((a, b) => a.startMinute - b.startMinute);
    const laneEnds: number[] = [];

    const lanesOf = sorted.map((item) => {
      const free = laneEnds.findIndex((end) => end <= item.startMinute);
      const lane = free === -1 ? laneEnds.length : free;

      laneEnds[lane] = item.endMinute;

      return lane;
    });

    for (const [index, item] of sorted.entries()) {
      const overlapping = sorted.filter(
        (other) =>
          other.startMinute < item.endMinute &&
          other.endMinute > item.startMinute
      );

      const lanes =
        Math.max(
          ...overlapping.map((other) => lanesOf[sorted.indexOf(other)] ?? 0)
        ) + 1;

      placed.push({ ...item, lane: lanesOf[index] ?? 0, lanes });
    }

    return placed;
  });

/** A seven-day calendar with a time grid, like the right pane of the app. */
export const WeekCalendar = ({
  title,
  subtitle,
  days,
  allDay = noAllDayItems,
  items,
  nowMinute = null,
  firstHour = 7,
  lastHour = 22,
  hourHeight = 80,
  onPrevious,
  onNext,
  onToday,
  onItemOpen,
  onDropTask,
}: WeekCalendarProps) => {
  const hours = Array.from(
    { length: lastHour - firstHour + 1 },
    (_, index) => firstHour + index
  );

  const height = (lastHour - firstHour + 1) * hourHeight;
  const columns = `${gutter}px repeat(${days.length}, minmax(0, 1fr))`;
  const placedByDay = placeItems(items, days.length);

  const top = (minute: number): number =>
    ((minute - firstHour * 60) / 60) * hourHeight;

  const acceptDrag = (event: DragEvent<HTMLOListElement>): void => {
    if (
      onDropTask !== undefined &&
      event.dataTransfer.types.includes(taskDragType)
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };

  const dropOn = (dayIndex: number) => (event: DragEvent<HTMLOListElement>) => {
    const taskId = event.dataTransfer.getData(taskDragType);

    if (
      onDropTask === undefined ||
      taskId === "" ||
      !Number.isFinite(event.clientY)
    ) {
      return;
    }

    event.preventDefault();

    const offset =
      event.clientY - event.currentTarget.getBoundingClientRect().top;

    const minute = firstHour * 60 + (offset / hourHeight) * 60;

    onDropTask(
      taskId,
      dayIndex,
      Math.round(minute / snapMinutes) * snapMinutes
    );
  };

  return (
    <section aria-label="Calendar" {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <h2 {...stylex.props(styles.title)}>{title}</h2>
        {subtitle === undefined ? null : (
          <span {...stylex.props(styles.subtitle)}>{subtitle}</span>
        )}
        <span {...stylex.props(styles.headerSpacer)} />
        <Button onClick={onToday} size="small" variant="outline">
          Today
        </Button>
        <IconButton
          icon={<ChevronLeft size={16} />}
          label="Previous week"
          onClick={onPrevious}
        />
        <IconButton
          icon={<ChevronRight size={16} />}
          label="Next week"
          onClick={onNext}
        />
      </div>

      <div
        {...stylex.props(styles.dayHeaders)}
        style={{ gridTemplateColumns: columns }}
      >
        <span />
        {days.map((day) => (
          <div
            aria-current={day.isToday ? "date" : undefined}
            key={day.key}
            {...stylex.props(styles.dayHeader)}
          >
            <span {...stylex.props(styles.weekday)}>{day.weekday}</span>
            <span
              {...stylex.props(
                styles.dayNumber,
                day.isToday && styles.dayNumberToday
              )}
            >
              {day.dayNumber}
            </span>
          </div>
        ))}
      </div>

      <div
        {...stylex.props(styles.allDay)}
        style={{ gridTemplateColumns: columns }}
      >
        <span {...stylex.props(styles.allDayLabel)}>all-day</span>
        {allDay.map((item, row) => (
          <span
            key={item.id}
            {...stylex.props(styles.allDayItem, toneStyles[item.tone])}
            style={{
              gridColumn: `${item.startIndex + 2} / ${item.endIndex + 3}`,
              gridRow: row + 1,
            }}
          >
            {item.title}
          </span>
        ))}
      </div>

      <div {...stylex.props(styles.scroll)}>
        <div
          {...stylex.props(styles.timeline)}
          style={{ gridTemplateColumns: columns, height }}
        >
          {hours.map((hour) => (
            <div
              aria-hidden
              key={hour}
              {...stylex.props(styles.hourLine)}
              style={{ top: top(hour * 60) }}
            >
              <span
                {...stylex.props(styles.hourLabel)}
                style={{ right: "100%" }}
              >
                {hour % 12 === 0 ? 12 : hour % 12} {hour < 12 ? "AM" : "PM"}
              </span>
            </div>
          ))}
          <span />
          {days.map((day, dayIndex) => (
            // Each day column accepts dropped task rows to time-block them.
            // Dragging is a mouse shortcut; the app also schedules by keyboard.
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <ol
              aria-label={`${day.weekday} ${day.dayNumber}`}
              key={day.key}
              onDragOver={acceptDrag}
              onDrop={dropOn(dayIndex)}
              {...stylex.props(
                styles.column,
                day.isToday && styles.columnToday
              )}
            >
              {day.isToday && nowMinute !== null ? (
                <li
                  {...stylex.props(styles.now)}
                  style={{ top: top(nowMinute) }}
                >
                  <span {...stylex.props(styles.nowDot)} />
                  <VisuallyHidden>Current time</VisuallyHidden>
                </li>
              ) : null}
              {(placedByDay[dayIndex] ?? []).map((item) => {
                const tall = item.endMinute - item.startMinute > 30;

                const itemStyle = stylex.props(
                  styles.item,
                  kindStyle[item.kind]
                );

                const position = {
                  height:
                    ((item.endMinute - item.startMinute) / 60) * hourHeight - 2,
                  left: `calc(${(item.lane / item.lanes) * 100}% + 3px)`,
                  top: top(item.startMinute) + 1,
                  width: `calc(${100 / item.lanes}% - 6px)`,
                };

                const content = (
                  <>
                    <span {...stylex.props(styles.itemTitle)}>
                      {item.kind === "task" &&
                        (item.done === true ? (
                          <SquareCheck aria-label="Done" size={11} />
                        ) : (
                          <Square aria-hidden size={11} />
                        ))}
                      {item.title}
                    </span>
                    {tall && item.detail !== undefined ? (
                      <span {...stylex.props(styles.detail)}>
                        {item.detail}
                      </span>
                    ) : null}
                  </>
                );

                return (
                  <li
                    key={item.id}
                    {...itemStyle}
                    style={{ ...itemStyle.style, ...position }}
                  >
                    {onItemOpen === undefined ? (
                      content
                    ) : (
                      <button
                        onClick={() => {
                          onItemOpen(item.id);
                        }}
                        type="button"
                        {...stylex.props(styles.itemButton)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          ))}
        </div>
      </div>
    </section>
  );
};
