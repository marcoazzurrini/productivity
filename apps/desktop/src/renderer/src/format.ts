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

/** ISO week number, as calendars show it: week 1 holds the year's first Thursday. */
export const weekNumber = (date: LocalDate): number => {
  const thursday = parseLocalDate(date);

  thursday.setDate(thursday.getDate() - ((thursday.getDay() + 6) % 7) + 3);

  const firstThursday = new Date(thursday.getFullYear(), 0, 4);

  const days = Math.round(
    (thursday.getTime() - firstThursday.getTime()) / 86_400_000
  );

  return 1 + Math.round((days - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
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
