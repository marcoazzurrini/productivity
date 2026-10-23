import { isOverdue } from "@productivity/gtd";
import type { Task } from "@productivity/gtd";
import { Tag, TaskRow } from "@productivity/ui";
import type { ReactNode } from "react";

import { useStoreAction } from "./data.ts";
import { durationLabel, shortDate, timeLabel } from "./format.ts";
import { useLookups } from "./lookups.ts";
import { useTaskDialog } from "./task-dialog.tsx";

export interface TaskItemProps {
  task: Task;
  today: string;
  /** Hide the project name, for lists that are already one project. */
  hideProject?: boolean;
  /** Hide the context tag, for lists already grouped by context. */
  hideContext?: boolean;
  actions?: ReactNode;
}

/** A task row wired to the store: tick to complete, click to edit, drag to schedule. */
export const TaskItem = ({
  task,
  today,
  hideProject = false,
  hideContext = false,
  actions,
}: TaskItemProps) => {
  const lookups = useLookups();
  const openTask = useTaskDialog();

  const complete = useStoreAction((store, done: boolean) =>
    store.setCompleted(task.id, done)
  );

  const context = lookups.context(task.contextId);
  const project = lookups.project(task.projectId);
  const done = task.completedAt !== null;

  const tags: ReactNode[] = [];

  if (!hideContext && context !== undefined) {
    tags.push(
      <Tag key="context" variant="outline">
        {context.name}
      </Tag>
    );
  }

  if (task.block !== null && !done) {
    tags.push(
      <Tag key="block" tone="accent">
        {timeLabel(task.block.start)}
      </Tag>
    );
  } else if (task.deadline !== null) {
    tags.push(
      <Tag key="deadline" tone={isOverdue(task, today) ? "red" : "gray"}>
        {shortDate(task.deadline)}
      </Tag>
    );
  } else if (task.minutes !== null) {
    tags.push(
      <Tag key="minutes" variant="outline">
        {durationLabel(task.minutes)}
      </Tag>
    );
  }

  return (
    <TaskRow
      actions={actions}
      done={done}
      dragId={done ? undefined : task.id}
      hasNotes={task.notes.length > 0}
      meta={hideProject ? undefined : project?.name}
      onDoneChange={(next) => {
        complete.mutate(next);
      }}
      onOpen={() => {
        openTask(task);
      }}
      starred={task.starred}
      tags={tags}
      title={task.title}
    />
  );
};
