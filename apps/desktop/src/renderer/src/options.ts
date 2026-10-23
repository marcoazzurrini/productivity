import type { Energy } from "@productivity/gtd";
import type { FilterOption } from "@productivity/ui";

import type { Lookups } from "./lookups.ts";

/** Select values are strings; "none" stands for an empty field. */
export const none = "none";

export const minuteOptions: readonly FilterOption[] = [
  { label: "—", value: none },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "1h", value: "60" },
  { label: "2h", value: "120" },
];

export const energyOptions: readonly FilterOption[] = [
  { label: "—", value: none },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export const contextOptions = (lookups: Lookups): FilterOption[] => [
  { label: "None", value: none },
  ...lookups.contexts.map((context) => ({
    label: context.name,
    value: context.id,
  })),
];

export const projectOptions = (lookups: Lookups): FilterOption[] => [
  { label: "None", value: none },
  ...lookups.projects.map((project) => ({
    label: project.name,
    value: project.id,
  })),
];

export const toId = (value: string): string | null =>
  value === none ? null : value;

export const toMinutes = (value: string): number | null =>
  value === none ? null : Number(value);

export const toEnergy = (value: string): Energy | null => {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return null;
};

export const toDate = (value: string): string | null =>
  value === "" ? null : value;
