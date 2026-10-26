export { createCalendar } from "./calendar.ts";

export type {
  Calendar,
  CalendarOptions,
  CalendarService,
  GoogleOptions,
} from "./calendar.ts";

export { CalendarError } from "./errors.ts";

export type { CalendarErrorReason } from "./errors.ts";

export { googleScopes } from "./google/oauth.ts";

export type {
  GoogleClient,
  RedirectListener,
  SecretStore,
} from "./google/oauth.ts";

export type * from "./model.ts";

export type * from "./repository.ts";

export {
  calendarMethods,
  createRemoteCalendar,
  isCalendarMethod,
} from "./remote.ts";

export type {
  CalendarMethod,
  CalendarTransport,
  RemoteCalendar,
} from "./remote.ts";
