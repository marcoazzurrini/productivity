import { isCalendarMethod } from "@productivity/calendar";
import type { Calendar, CalendarMethod } from "@productivity/calendar";

export class UnknownCalendarMethodError extends Error {
  constructor(method: string) {
    super(`"${method}" is not a calendar method.`);
    this.name = "UnknownCalendarMethodError";
  }
}

/**
 * Runs one calendar method. The generic signature keeps each method's
 * arguments and result tied together for typed callers such as tests.
 */
export const runCalendarMethod = async <Method extends CalendarMethod>(
  calendar: Calendar,
  method: Method,
  args: Parameters<Calendar[Method]>
): Promise<Awaited<ReturnType<Calendar[Method]>>> => {
  // SAFETY: indexing Calendar with a single method name yields that method;
  // TypeScript cannot correlate the generic key with its parameter list.
  const run = calendar[method] as (
    ...input: Parameters<Calendar[Method]>
  ) => ReturnType<Calendar[Method]>;

  return await run(...args);
};

type CalendarArgs = Parameters<Calendar[CalendarMethod]>;

/**
 * Runs one call from the renderer. Only methods of the Calendar interface
 * are allowed; the calendar itself checks every argument it stores.
 */
export const callCalendar = (
  calendar: Calendar,
  method: string,
  args: CalendarArgs
) => {
  if (!isCalendarMethod(method)) {
    throw new UnknownCalendarMethodError(method);
  }

  // SAFETY: the renderer builds `args` with createRemoteCalendar, and the
  // calendar validates the values it is given.
  return runCalendarMethod(
    calendar,
    method,
    args as Parameters<Calendar[typeof method]>
  );
};
