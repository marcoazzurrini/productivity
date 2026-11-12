import type { ProjectDetail, Task } from "@productivity/gtd";
import {
  Button,
  IconButton,
  Menu,
  Popover,
  TextField,
  useToast,
} from "@productivity/ui";
import type { MenuAction } from "@productivity/ui";
import { color, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Calendar, ListPlus, Plus, Search } from "lucide-react";
import { useState } from "react";

import { useCommand } from "./commands.tsx";
import { useStoreAction } from "./data.ts";
import { shortDate } from "./format.ts";
import { useLookups } from "./lookups.ts";
import { useQuickCapture } from "./quick-capture.tsx";
import { useQuickFind } from "./quick-find.tsx";
import { useSelection } from "./selection.tsx";

const styles = stylex.create({
  buttons: {
    display: "flex",
    gap: space.s2,
    justifyContent: "flex-end",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: space.s3,
    width: 220,
  },
  toolbar: {
    alignItems: "center",
    backgroundColor: color.bgPage,
    borderTopColor: color.borderDefault,
    borderTopStyle: "solid",
    borderTopWidth: 1,
    display: "flex",
    flexShrink: 0,
    // 72 px on the full-width column, closer together on a narrow window.
    gap: "clamp(24px, 9%, 72px)",
    height: 52,
    justifyContent: "center",
  },
});

const taskLists = [["next"], ["upcoming"], ["waiting"], ["someday"], ["inbox"]];

/**
 * The selected to-do, from whichever list already loaded it. The toolbar
 * needs its title, start date and project, not a fetch of its own.
 */
const useSelectedTask = (): Task | undefined => {
  const { selectedId } = useSelection();
  const client = useQueryClient();

  if (selectedId === null) {
    return undefined;
  }

  return [
    ...taskLists.flatMap((key) => client.getQueryData<Task[]>(key) ?? []),
    ...client
      .getQueriesData<ProjectDetail | null>({ queryKey: ["project"] })
      .flatMap(([, detail]) => detail?.tasks ?? []),
  ].find((task) => task.id === selectedId);
};

/** Disabled buttons stay reachable by keyboard, so their name can say why. */
const disabledProps = { disabled: true, focusableWhenDisabled: true } as const;

/** Sets the day a to-do starts: it waits in Upcoming until then. */
const WhenButton = ({ task }: { task: Task | undefined }) => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");

  const schedule = useStoreAction(
    (store, input: { id: string; startOn: string | null }) =>
      store.updateTask(input.id, { startOn: input.startOn })
  );

  if (task === undefined) {
    return (
      <IconButton
        {...disabledProps}
        icon={<Calendar size={18} />}
        label="When: select a to-do first"
        size="large"
        tone="secondary"
      />
    );
  }

  const save = (startOn: string | null): void => {
    schedule.mutate(
      { id: task.id, startOn },
      {
        onSuccess: () => {
          toast({
            title:
              startOn === null
                ? `“${task.title}” has no start date`
                : `“${task.title}” starts ${shortDate(startOn)}`,
          });
        },
      }
    );
    setOpen(false);
  };

  return (
    <Popover
      align="center"
      label="When"
      onOpenChange={(next) => {
        if (next) {
          setDate(task.startOn ?? "");
        }

        setOpen(next);
      }}
      open={open}
      side="top"
      trigger={
        <IconButton
          icon={<Calendar size={18} />}
          label="When"
          size="large"
          tone="secondary"
        />
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (date !== "") {
            save(date);
          }
        }}
        {...stylex.props(styles.form)}
      >
        <TextField
          autoFocus
          description="It waits in Upcoming until this day."
          label="Start on"
          onValueChange={setDate}
          type="date"
          value={date}
        />
        <span {...stylex.props(styles.buttons)}>
          <Button
            disabled={task.startOn === null}
            onClick={() => {
              save(null);
            }}
            size="small"
            type="button"
            variant="outline"
          >
            Clear
          </Button>
          <Button
            disabled={date === ""}
            size="small"
            type="submit"
            variant="primary"
          >
            Save
          </Button>
        </span>
      </form>
    </Popover>
  );
};

/** Moves a to-do into a project, or out of every project. */
const MoveButton = ({ task }: { task: Task | undefined }) => {
  const toast = useToast();
  const { projects } = useLookups();

  const move = useStoreAction(
    (store, input: { id: string; projectId: string | null }) =>
      store.updateTask(input.id, { projectId: input.projectId })
  );

  if (task === undefined) {
    return (
      <IconButton
        {...disabledProps}
        icon={<ArrowRight size={18} />}
        label="Move: select a to-do first"
        size="large"
        tone="secondary"
      />
    );
  }

  const moveTo = (projectId: string | null, name: string) => (): void => {
    move.mutate(
      { id: task.id, projectId },
      {
        onSuccess: () => {
          toast({
            title:
              projectId === null
                ? `“${task.title}” is in no project`
                : `Moved “${task.title}” to ${name}`,
          });
        },
      }
    );
  };

  const items: (MenuAction | "separator")[] = [
    {
      checked: task.projectId === null,
      id: "none",
      label: "No project",
      onSelect: moveTo(null, ""),
    },
    ...(projects.length === 0 ? [] : ["separator" as const]),
    ...projects.map((project) => ({
      checked: task.projectId === project.id,
      id: project.id,
      label: project.name,
      onSelect: moveTo(project.id, project.name),
    })),
  ];

  return (
    <Menu
      align="center"
      items={items}
      side="top"
      trigger={
        <IconButton
          icon={<ArrowRight size={18} />}
          label="Move"
          size="large"
          tone="secondary"
        />
      }
    />
  );
};

/**
 * The bar under every page: add a to-do or a heading, give the selected
 * to-do a start date or a project, and find anything.
 */
export const MainToolbar = () => {
  const openCapture = useQuickCapture();
  const openQuickFind = useQuickFind();
  const newHeading = useCommand("new-heading");
  const task = useSelectedTask();

  return (
    <div
      aria-label="To-do actions"
      role="toolbar"
      {...stylex.props(styles.toolbar)}
    >
      <IconButton
        icon={<Plus size={18} />}
        label="New to-do (⌘N)"
        onClick={openCapture}
        size="large"
        tone="secondary"
      />
      {newHeading === undefined ? (
        <IconButton
          {...disabledProps}
          icon={<ListPlus size={18} />}
          label="New heading: open a project first"
          size="large"
          tone="secondary"
        />
      ) : (
        <IconButton
          icon={<ListPlus size={18} />}
          label="New heading"
          onClick={newHeading}
          size="large"
          tone="secondary"
        />
      )}
      <WhenButton task={task} />
      <MoveButton task={task} />
      <IconButton
        icon={<Search size={18} />}
        label="Quick find (⌘P)"
        onClick={openQuickFind}
        size="large"
        tone="secondary"
      />
    </div>
  );
};
