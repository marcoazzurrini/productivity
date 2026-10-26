import type { Project, Task } from "@productivity/gtd";

import type { projects, tasks } from "./schema.ts";

/**
 * Converts between Drizzle rows and the GTD model. The two differ only
 * where the model groups columns, like a task's time block.
 */

export type TaskRow = typeof tasks.$inferSelect;

export const toTask = ({ blockEnd, blockStart, ...row }: TaskRow): Task => ({
  ...row,
  block:
    blockStart === null || blockEnd === null
      ? null
      : { end: blockEnd, start: blockStart },
});

export const toTaskRow = ({ block, ...task }: Task): TaskRow => ({
  ...task,
  blockEnd: block?.end ?? null,
  blockStart: block?.start ?? null,
});

export const toProject = (row: typeof projects.$inferSelect): Project => ({
  areaId: row.areaId,
  deadline: row.deadline,
  id: row.id,
  name: row.name,
  outcome: row.outcome,
  status: row.status,
});
