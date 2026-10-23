import { parseLocalDate, parseLocalDateTime } from "@productivity/gtd";
import type { LocalDate, LocalDateTime } from "@productivity/gtd";

const dayMonth = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

const weekdayDayMonth = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  weekday: "short",
});

const longDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  weekday: "long",
});

const monthYear = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const weekdayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" });

const time = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/** "Oct 21". */
export const shortDate = (date: LocalDate): string =>
  dayMonth.format(parseLocalDate(date));

/** "Fri Oct 24". */
export const dayLabel = (date: LocalDate): string =>
  weekdayDayMonth.format(parseLocalDate(date)).replace(",", "");

/** "Thursday, October 23". */
export const fullDate = (date: LocalDate): string =>
  longDate.format(parseLocalDate(date));

export const monthLabel = (date: LocalDate): string =>
  monthYear.format(parseLocalDate(date));

export const weekdayLabel = (date: LocalDate): string =>
  weekdayShort.format(parseLocalDate(date));

/** "2:40 PM". */
export const timeLabel = (value: LocalDateTime): string =>
  time.format(parseLocalDateTime(value));

/** ISO week number, as calendars show it. */
export const weekNumber = (date: LocalDate): number => {
  const day = parseLocalDate(date);
  const thursday = new Date(day);

  thursday.setDate(day.getDate() + 3 - ((day.getDay() + 6) % 7));

  const firstThursday = new Date(thursday.getFullYear(), 0, 4);

  return (
    1 +
    Math.round(
      (thursday.getTime() - firstThursday.getTime()) / 604_800_000 -
        (((firstThursday.getDay() + 6) % 7) - 3) / 7
    )
  );
};

/** "15m", "1h", "1h 30m". */
export const durationLabel = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};
