import type { StoreTransport } from "@productivity/gtd";

declare global {
  interface Window {
    /** Set by the preload script. The renderer's only door to the database. */
    gtd: { call: StoreTransport };
  }
}
