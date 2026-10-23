import { openStore } from "../src/index.ts";
import type { Store } from "../src/index.ts";

/** Thursday 23 October 2026, 14:40 local time: the day the design shows. */
export const fixedNow = new Date(2026, 9, 23, 14, 40);

export const memoryStore = (sample = false): Store =>
  openStore({ clock: () => fixedNow, path: ":memory:", sample });
