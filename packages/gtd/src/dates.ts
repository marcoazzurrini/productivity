/** A calendar day in the user's local time, written as `YYYY-MM-DD`. */
export type LocalDate = string;

/** A wall-clock moment in the user's local time, written as `YYYY-MM-DDTHH:mm`. */
export type LocalDateTime = string;

const pad = (value: number): string => String(value).padStart(2, "0");

export const toLocalDate = (date: Date): LocalDate =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const toLocalDateTime = (date: Date): LocalDateTime =>
  `${toLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Parses a local date at midnight. Arithmetic stays correct across daylight-saving changes. */
export const parseLocalDate = (value: LocalDate): Date => {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
};

export const parseLocalDateTime = (value: LocalDateTime): Date => {
  const [datePart = "", timePart = "00:00"] = value.split("T");
  const [hours = 0, minutes = 0] = timePart.split(":").map(Number);
  const date = parseLocalDate(datePart);

  date.setHours(hours, minutes, 0, 0);

  return date;
};

export const addDays = (value: LocalDate, days: number): LocalDate => {
  const date = parseLocalDate(value);

  date.setDate(date.getDate() + days);

  return toLocalDate(date);
};

/** Monday of the week that contains `value`. */
export const startOfWeek = (value: LocalDate): LocalDate => {
  const weekday = parseLocalDate(value).getDay();
  const daysSinceMonday = (weekday + 6) % 7;

  return addDays(value, -daysSinceMonday);
};

/** The seven days, Monday to Sunday, of the week that contains `value`. */
export const weekDays = (value: LocalDate): LocalDate[] => {
  const monday = startOfWeek(value);

  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
};

export const datePart = (value: LocalDateTime): LocalDate => value.slice(0, 10);

/** Minutes since midnight for a local date-time. */
export const minuteOfDay = (value: LocalDateTime): number => {
  const date = parseLocalDateTime(value);

  return date.getHours() * 60 + date.getMinutes();
};
