import type { StoreTransport } from "@productivity/gtd";

import type { JournalBridge } from "../../shared/journal.ts";

declare global {
  interface Window {
    /** Set by the preload script. The renderer's only door to the database. */
    gtd: { call: StoreTransport };
    /** Set by the preload script. The renderer's only door to the journal. */
    journal: JournalBridge;
  }
}
