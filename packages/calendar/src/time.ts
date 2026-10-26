import type { LocalDate, LocalDateTime } from "./model.ts";

const pad = (value: number): string => String(value).padStart(2, "0");

const dateTimePattern =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})(?:T(?<hours>\d{2}):(?<minutes>\d{2}))?$/u;

interface Parts {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  hasTime: boolean;
}

const partsOf = (value: string): Parts | null => {
  const groups = dateTimePattern.exec(value)?.groups;

  if (groups === undefined) {
    return null;
  }

  return {
    day: Number(groups.day),
    hasTime: groups.hours !== undefined,
    hours: Number(groups.hours ?? 0),
    minutes: Number(groups.minutes ?? 0),
    month: Number(groups.month),
    year: Number(groups.year),
  };
};

const formatDate = (date: Date): LocalDate =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isRealDay = (parts: Parts): boolean => {
  const date = new Date(parts.year, parts.month - 1, parts.day);

  return (
    date.getFullYear() === parts.year &&
    date.getMonth() === parts.month - 1 &&
    date.getDate() === parts.day
  );
};

/** True only for text: anything else differs from its own string form. */
export const isText = (value: unknown): value is string =>
  String(value) === value;

/** True for a real day such as "2026-10-24", false for "2026-02-30". */
export const isLocalDate = (value: unknown): value is LocalDate => {
  const parts = isText(value) ? partsOf(value) : null;

  return parts !== null && !parts.hasTime && isRealDay(parts);
};

export const isLocalDateTime = (value: unknown): value is LocalDateTime => {
  const parts = isText(value) ? partsOf(value) : null;

  return (
    parts !== null &&
    parts.hasTime &&
    isRealDay(parts) &&
    parts.hours < 24 &&
    parts.minutes < 60
  );
};

/**
 * Timed events are stored as UTC instants, so they keep their real moment
 * when the clocks change or the user travels.
 */
export const toInstant = (value: LocalDateTime): string => {
  const parts = partsOf(value);

  return parts === null
    ? new Date(Number.NaN).toISOString()
    : new Date(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hours,
        parts.minutes
      ).toISOString();
};

/** Any instant Date can parse, such as Google's "2026-10-25T09:00:00+01:00". */
export const instantOf = (value: string): string =>
  new Date(value).toISOString();

export const toLocalDateTime = (instant: string): LocalDateTime => {
  const date = new Date(instant);

  return `${formatDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const startOfDay = (day: LocalDate): string => toInstant(`${day}T00:00`);

export const addDays = (day: LocalDate, days: number): LocalDate => {
  const parts = partsOf(day);

  return parts === null
    ? day
    : formatDate(new Date(parts.year, parts.month - 1, parts.day + days));
};
