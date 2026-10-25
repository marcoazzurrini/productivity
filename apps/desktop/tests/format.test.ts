import { describe, expect, it } from "vitest";

import {
  dayLabel,
  durationLabel,
  weekNumber,
  wordCount,
} from "../src/renderer/src/format.ts";

describe(weekNumber, () => {
  it.each([
    ["2026-10-24", 43],
    ["2026-10-19", 43],
    ["2026-01-01", 1],
    ["2025-12-29", 1],
    ["2027-01-03", 53],
    ["2021-01-03", 53],
  ])("puts %s in ISO week %i", (date, week) => {
    expect(weekNumber(date)).toBe(week);
  });
});

describe("labels", () => {
  it("formats durations the way task rows show them", () => {
    expect([15, 60, 90].map(durationLabel)).toStrictEqual([
      "15m",
      "1h",
      "1h 30m",
    ]);
  });

  it("formats a day without a comma", () => {
    expect(dayLabel("2026-10-24")).toBe("Sat Oct 24");
  });
});

describe(wordCount, () => {
  it.each([
    ["", 0],
    ["   \n ", 0],
    ["Slept well.", 2],
    ["## Morning\n\n- [ ] Book flights\n- [x] Send **the** draft", 6],
    ["It's 8 km, give or take", 6],
    ["Café — très bien", 3],
  ])("counts %j as %i words", (markdown, words) => {
    expect(wordCount(markdown)).toBe(words);
  });
});
