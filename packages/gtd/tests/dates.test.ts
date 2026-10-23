import { expect, test } from "bun:test";

import { addDays, minuteOfDay, startOfWeek, weekDays } from "../src/index.ts";

test("weeks run Monday to Sunday", () => {
  expect(startOfWeek("2026-10-26")).toBe("2026-10-26");
  expect(startOfWeek("2026-10-25")).toBe("2026-10-19");
  expect(weekDays("2026-10-23")).toEqual([
    "2026-10-19",
    "2026-10-20",
    "2026-10-21",
    "2026-10-22",
    "2026-10-23",
    "2026-10-24",
    "2026-10-25",
  ]);
});

test("day arithmetic crosses months and daylight-saving changes", () => {
  expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
});

test("minuteOfDay reads local wall-clock time", () => {
  expect(minuteOfDay("2026-10-23T14:40")).toBe(880);
});
