import { datePart, isOverdue } from "@productivity/gtd";
import type { Task } from "@productivity/gtd";
import { Tag, TaskRow } from "@productivity/ui";
import type { ReactNode } from "react";

import { useStoreAction } from "./data.ts";
import { durationLabel, shortDate, timeLabel, weekdayLabel } from "./format.ts";
import { useLookups } from "./lookups.ts";
import { useSelection } from "./selection.tsx";
import { useTaskDialog } from "./task-dialog.tsx";

export interface TaskItemProps {
  task: Task;
  today: string;
  /** Hide the project name, for lists that are already one project. */
  hideProject?: boolean;
  /** Hide the context tag, for lists already grouped by context. */
  hideContext?: boolean;
  actions?: ReactNode;
  /** Shown in place of the task's title, such as "Olivia: data export". */
  title?: string;
  /** Quiet text before the tags, in place of the project or duration. */
  meta?: string;
  /** Shown in place of the usual context and date tags. */
  tags?: ReactNode;
}

/**
 * The one chip at the end of a row, by what matters most: the time the task
 * is planned for, else its deadline, else how long it takes.
 */
const chipOf = (
  task: Task,
  today: string,
  done: boolean,
  showDuration: boolean
): ReactNode => {
  if (task.block !== null && !done) {
    const day = datePart(task.block.start);
    const time = timeLabel(task.block.start);

    return (
      <Tag key="block" size="small" tone="accent">
        {/* A time alone means today. */}
        {day === today ? time : `${weekdayLabel(day)} ${time}`}
      </Tag>
    );
  }

  if (task.deadline !== null) {
    return (
      <Tag
        key="deadline"
        size="small"
        tone={isOverdue(task, today) ? "red" : "neutral"}
      >
        {shortDate(task.deadline)}
      </Tag>
    );
  }

  if (task.minutes !== null && showDuration) {
    return (
      <Tag key="minutes" size="small" tone="neutral">
        {durationLabel(task.minutes)}
      </Tag>
    );
  }

  return null;
};

/**
 * A task row wired to the store: tick to complete, click to select, double
 * click or press Enter to edit, drag to schedule.
 */
export const TaskItem = ({
  task,
  today,
  hideProject = false,
  hideContext = false,
  actions,
  title,
  meta,
  tags,
}: TaskItemProps) => {
  const lookups = useLookups();
  const openTask = useTaskDialog();
  const { selectedId, select } = useSelection();

  const complete = useStoreAction((store, done: boolean) =>
    store.setCompleted(task.id, done)
  );

  const context = lookups.context(task.contextId);
  const project = lookups.project(task.projectId);
  const done = task.completedAt !== null;

  // Inside a project the project's name is not shown, so the quiet text
  // before the tags is free for the duration. Elsewhere it is a chip.
  const chip = chipOf(task, today, done, !hideProject);

  const durationAsText =
    hideProject && chip === null && task.minutes !== null
      ? durationLabel(task.minutes)
      : undefined;

  return (
    <TaskRow
      actions={actions}
      done={done}
      dragId={done ? undefined : task.id}
      hasNotes={task.notes.length > 0}
      meta={meta ?? (hideProject ? durationAsText : project?.name)}
      onDoneChange={(next) => {
        complete.mutate(next);
      }}
      onOpen={() => {
        openTask(task);
      }}
      onSelect={() => {
        select(task.id);
      }}
      selected={selectedId === task.id}
      starred={task.starred}
      tags={
        tags ?? (
          <>
            {hideContext || context === undefined ? null : (
              <Tag variant="outline">{context.name}</Tag>
            )}
            {chip}
          </>
        )
      }
      title={title ?? task.title}
    />
  );
};
