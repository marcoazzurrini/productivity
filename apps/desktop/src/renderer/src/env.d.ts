import type { StoreTransport } from "@productivity/gtd";

import type { CalendarBridge } from "../../shared/calendar.ts";
import type { JournalBridge } from "../../shared/journal.ts";

declare global {
  interface Window {
    /** Set by the preload script. The renderer's only door to the database. */
    gtd: { call: StoreTransport };
    /** Set by the preload script. The renderer's only door to the journal. */
    journal: JournalBridge;
    /** Set by the preload script. The renderer's only door to the calendar. */
    calendar: CalendarBridge;
  }
}
