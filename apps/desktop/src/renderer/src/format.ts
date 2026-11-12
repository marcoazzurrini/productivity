import { addDays, parseLocalDate, parseLocalDateTime } from "@productivity/gtd";
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

const weekdayLong = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const monthLong = new Intl.DateTimeFormat("en-US", { month: "long" });

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

/** "Fri, Oct 24". */
export const dayLabelWithComma = (date: LocalDate): string =>
  weekdayDayMonth.format(parseLocalDate(date));

/** "Friday, 23 October": the day before the month, as the journal titles its pages. */
export const fullDate = (date: LocalDate): string => {
  const day = parseLocalDate(date);

  return `${weekdayLong.format(day)}, ${day.getDate()} ${monthLong.format(day)}`;
};

/**
 * How long ago a day was, the way a list of recent things says it: nothing
 * for today, "Yesterday", the weekday within the last week, then "Oct 21".
 */
export const recentDay = (date: LocalDate, today: LocalDate): string => {
  if (date === today) {
    return "";
  }

  if (date === addDays(today, -1)) {
    return "Yesterday";
  }

  return date > addDays(today, -7) && date < today
    ? weekdayShort.format(parseLocalDate(date))
    : shortDate(date);
};

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

/** Words a person would count: to-do boxes and Markdown symbols are not words. */
export const wordCount = (markdown: string): number =>
  markdown
    .replaceAll(/\[[ xX]\]/gu, " ")
    .match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
