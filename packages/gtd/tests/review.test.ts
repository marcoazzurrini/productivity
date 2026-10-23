import { expect, test } from "bun:test";

import {
  isReviewDue,
  nextReviewOn,
  reviewPhases,
  reviewSteps,
} from "../src/index.ts";

test("every review step belongs to a known phase", () => {
  const phases = new Set(reviewPhases.map((phase) => phase.id));

  expect(reviewSteps.every((step) => phases.has(step.phase))).toBe(true);
});

test("the next review falls on Friday", () => {
  expect(nextReviewOn("2026-10-23")).toBe("2026-10-23");
  expect(nextReviewOn("2026-10-24")).toBe("2026-10-30");
});

test("a review is due a week after the last one", () => {
  expect(isReviewDue(null, "2026-10-23")).toBe(true);
  expect(isReviewDue("2026-10-17", "2026-10-23")).toBe(false);
  expect(isReviewDue("2026-10-16", "2026-10-23")).toBe(true);
});
