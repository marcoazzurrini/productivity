import type { Task } from "@productivity/gtd";
import { Button, Dialog, FilterSelect, Kbd, TextField } from "@productivity/ui";
import { color, font, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useStoreAction } from "./data.ts";
import { useLookups } from "./lookups.ts";
import {
  contextOptions,
  energyOptions,
  minuteOptions,
  none,
  projectOptions,
  toDate,
  toEnergy,
  toId,
  toMinutes,
} from "./options.ts";

const TaskDialogContext = createContext<((task: Task) => void) | null>(null);

const styles = stylex.create({
  grid: {
    display: "grid",
    gap: space.s3,
    gridTemplateColumns: "1fr 1fr",
    marginTop: space.s4,
  },
  hint: {
    color: color.textTertiary,
    fontFamily: font.family,
    fontSize: font.size12,
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.s2,
    marginTop: space.s3,
  },
  section: {
    color: color.textSecondary,
    fontFamily: font.family,
    fontSize: font.size13,
    fontWeight: font.weightSemibold,
    marginBottom: 0,
    marginTop: space.s5,
  },
  spacer: { flexGrow: 1 },
});

interface Draft {
  title: string;
  notes: string;
  contextId: string;
  projectId: string;
  minutes: string;
  energy: string;
  startOn: string;
  deadline: string;
  blockDay: string;
  blockTime: string;
}

const draftOf = (task: Task): Draft => ({
  blockDay: task.block?.start.slice(0, 10) ?? "",
  blockTime: task.block?.start.slice(11, 16) ?? "",
  contextId: task.contextId ?? none,
  deadline: task.deadline ?? "",
  energy: task.energy ?? none,
  minutes: task.minutes === null ? none : String(task.minutes),
  notes: task.notes,
  projectId: task.projectId ?? none,
  startOn: task.startOn ?? "",
  title: task.title,
});

const pad = (value: number): string => String(value).padStart(2, "0");

const addMinutes = (start: string, minutes: number): string => {
  const date = new Date(`${start}:00`);

  date.setMinutes(date.getMinutes() + minutes);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const TaskEditor = ({ task, onClose }: { task: Task; onClose: () => void }) => {
  const lookups = useLookups();
  const [draft, setDraft] = useState(() => draftOf(task));

  const set = (field: keyof Draft) => (value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const save = useStoreAction(async (store, current: Draft) => {
    await store.updateTask(task.id, {
      contextId: toId(current.contextId),
      deadline: toDate(current.deadline),
      energy: toEnergy(current.energy),
      minutes: toMinutes(current.minutes),
      notes: current.notes,
      projectId: toId(current.projectId),
      startOn: toDate(current.startOn),
      title: current.title.trim() === "" ? task.title : current.title.trim(),
    });

    const start =
      current.blockDay === "" || current.blockTime === ""
        ? null
        : `${current.blockDay}T${current.blockTime}`;

    await store.scheduleBlock(
      task.id,
      start === null
        ? null
        : { end: addMinutes(start, toMinutes(current.minutes) ?? 30), start }
    );
  });

  const remove = useStoreAction((store, id: string) => store.deleteTask(id));

  const submit = (): void => {
    save.mutate(draft);
    onClose();
  };

  return (
    <Dialog
      footer={
        <>
          <Button
            onClick={() => {
              remove.mutate(task.id);
              onClose();
            }}
            size="small"
            variant="ghost"
          >
            Delete
          </Button>
          <span {...stylex.props(styles.spacer)} />
          <span {...stylex.props(styles.hint)}>
            <Kbd>⌘↵</Kbd> Save
          </span>
          <Button onClick={onClose} size="small" variant="outline">
            Cancel
          </Button>
          <Button onClick={submit} size="small" variant="primary">
            Save
          </Button>
        </>
      }
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
      title="Edit to-do"
    >
      <TextField
        appearance="bare"
        autoFocus
        hideLabel
        label="Title"
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.metaKey) {
            // Keeps the Enter from pressing the button that gets focus back.
            event.preventDefault();
            submit();
          }
        }}
        onValueChange={set("title")}
        value={draft.title}
      />
      <TextField
        hideLabel
        label="Notes"
        multiline
        onValueChange={set("notes")}
        placeholder="Notes"
        value={draft.notes}
      />
      <div {...stylex.props(styles.row)}>
        <FilterSelect
          label="Context"
          onValueChange={set("contextId")}
          options={contextOptions(lookups)}
          value={draft.contextId}
        />
        <FilterSelect
          label="Project"
          onValueChange={set("projectId")}
          options={projectOptions(lookups)}
          value={draft.projectId}
        />
        <FilterSelect
          label="Time"
          onValueChange={set("minutes")}
          options={minuteOptions}
          value={draft.minutes}
        />
        <FilterSelect
          label="Energy"
          onValueChange={set("energy")}
          options={energyOptions}
          value={draft.energy}
        />
      </div>
      <div {...stylex.props(styles.grid)}>
        <TextField
          description="Hidden from Next Actions until then."
          label="Start on"
          onValueChange={set("startOn")}
          type="date"
          value={draft.startOn}
        />
        <TextField
          label="Deadline"
          onValueChange={set("deadline")}
          type="date"
          value={draft.deadline}
        />
      </div>
      <h3 {...stylex.props(styles.section)}>Time block on the calendar</h3>
      <div {...stylex.props(styles.grid)}>
        <TextField
          label="Day"
          onValueChange={set("blockDay")}
          type="date"
          value={draft.blockDay}
        />
        <TextField
          label="Start time"
          onValueChange={set("blockTime")}
          placeholder="14:00"
          value={draft.blockTime}
        />
      </div>
    </Dialog>
  );
};

/** Lets any task row open the edit dialog. */
export const TaskDialogProvider = ({ children }: { children: ReactNode }) => {
  const [task, setTask] = useState<Task | null>(null);

  const open = useCallback((next: Task) => {
    setTask(next);
  }, []);

  const close = useMemo(
    () => () => {
      setTask(null);
    },
    []
  );

  return (
    <TaskDialogContext value={open}>
      {children}
      {task === null ? null : (
        <TaskEditor key={task.id} onClose={close} task={task} />
      )}
    </TaskDialogContext>
  );
};

export const useTaskDialog = (): ((task: Task) => void) => {
  const open = use(TaskDialogContext);

  if (open === null) {
    throw new Error("useTaskDialog needs a TaskDialogProvider above it.");
  }

  return open;
};
