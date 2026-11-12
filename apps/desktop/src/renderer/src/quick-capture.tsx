import type { LocalDate } from "@productivity/gtd";
import {
  Button,
  Dialog,
  Kbd,
  Menu,
  Popover,
  TextField,
  useToast,
} from "@productivity/ui";
import type { MenuAction } from "@productivity/ui";
import {
  color,
  font,
  radius,
  shadow,
  space,
} from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import {
  AtSign,
  Calendar,
  CirclePlus,
  Flag,
  Folder,
  Inbox,
} from "lucide-react";
import { createContext, use, useCallback, useEffect, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

import { errorText, useOverview, useStoreAction } from "./data.ts";
import { dayLabel, shortDate } from "./format.ts";
import { useLookups } from "./lookups.ts";
import { useNavigation } from "./navigation.tsx";

const QuickCaptureContext = createContext<(() => void) | null>(null);

const styles = stylex.create({
  // Notes and chips line up with the title, past the 20px icon and its gap.
  aligned: { paddingInlineStart: space.s8 },
  body: { display: "flex", flexDirection: "column", gap: 10 },
  chip: {
    alignItems: "center",
    backgroundColor: { ":hover": color.bgHover, default: "transparent" },
    borderColor: color.borderDefault,
    borderRadius: radius.md,
    borderStyle: "solid",
    borderWidth: 1,
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    color: color.textTertiary,
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    fontFamily: font.family,
    fontSize: font.size12,
    fontWeight: font.weightMedium,
    gap: 6,
    height: 26,
    outline: "none",
    paddingInline: space.s2,
  },
  // A chip that holds a value, or the Inbox chip while nothing else is set.
  chipActive: {
    backgroundColor: { ":hover": color.bgPressed, default: color.bgHover },
    borderColor: "transparent",
    color: color.textPrimary,
  },
  chipIcon: { display: "flex" },
  chipIconActive: { color: color.accent },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: space.s1,
  },
  dateField: {
    alignItems: "flex-start",
    display: "flex",
    flexDirection: "column",
    gap: space.s2,
    minWidth: 180,
  },
  hint: {
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    fontFamily: font.family,
    fontSize: font.size12,
    gap: 6,
  },
  hints: { display: "flex", gap: space.s4 },
  icon: { color: color.accent, display: "flex", flexShrink: 0 },
  spacer: { flexGrow: 1 },
  title: { flexGrow: 1 },
  titleRow: { alignItems: "center", display: "flex", gap: space.s3 },
});

/**
 * One of the chips under the notes. It takes the props a Menu or Popover
 * adds to its trigger, so the same chip works alone or as a trigger.
 */
const Chip = ({
  active,
  icon,
  children,
  ...rest
}: Omit<ComponentProps<"button">, "className" | "style" | "type"> & {
  active: boolean;
  icon: ReactNode;
}) => (
  <button
    {...rest}
    type="button"
    {...stylex.props(styles.chip, active && styles.chipActive)}
  >
    <span
      aria-hidden
      {...stylex.props(styles.chipIcon, active && styles.chipIconActive)}
    >
      {icon}
    </span>
    {children}
  </button>
);

/** A chip that opens one date field, for "When" and "Deadline". */
const DateChip = ({
  name,
  label,
  description,
  icon,
  value,
  shown,
  onValueChange,
}: {
  /** The chip's text while it holds no date. */
  name: string;
  /** The date field's label. */
  label: string;
  description: string;
  icon: ReactNode;
  value: string;
  /** The chip's text once it holds a date. */
  shown: string;
  onValueChange: (value: string) => void;
}) => (
  <Popover
    label={name}
    trigger={
      <Chip active={value !== ""} icon={icon}>
        {value === "" ? name : shown}
      </Chip>
    }
  >
    <div {...stylex.props(styles.dateField)}>
      <TextField
        description={description}
        label={label}
        onValueChange={onValueChange}
        type="date"
        value={value}
      />
      {value === "" ? null : (
        <Button
          onClick={() => {
            onValueChange("");
          }}
          size="small"
          variant="ghost"
        >
          Clear
        </Button>
      )}
    </div>
  </Popover>
);

const emptyDate = "";

const CaptureDialog = ({ onClose }: { onClose: () => void }) => {
  const { view, go } = useNavigation();
  const toast = useToast();
  const lookups = useLookups();
  const today = useOverview().data?.today;
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [contextId, setContextId] = useState<string | null>(null);

  // Captured from a project's page, a to-do most likely belongs to it.
  const [projectId, setProjectId] = useState<string | null>(
    view.kind === "project" ? view.projectId : null
  );

  const [startOn, setStartOn] = useState<LocalDate>(emptyDate);
  const [deadline, setDeadline] = useState<LocalDate>(emptyDate);

  const context = lookups.context(contextId);
  const project = lookups.project(projectId);

  // With any chip set the item is already clarified: it skips the Inbox.
  const organized =
    contextId !== null ||
    projectId !== null ||
    startOn !== emptyDate ||
    deadline !== emptyDate;

  let destination = "Inbox";

  if (organized) {
    destination =
      project?.name ??
      (today !== undefined && startOn > today ? "Upcoming" : "Next Actions");
  }

  const capture = useStoreAction(
    async (store, input: { title: string; notes: string }) => {
      const captured = await store.capture(input);

      if (organized) {
        await store.clarify(captured.id, {
          kind: "action",
          owner: { kind: "me" },
          project:
            projectId === null
              ? { kind: "none" }
              : { kind: "existing", projectId },
          title: input.title,
          when: {
            contextId,
            deadline: deadline === emptyDate ? null : deadline,
            energy: null,
            minutes: null,
            startOn: startOn === emptyDate ? null : startOn,
          },
        });
      }

      return captured;
    }
  );

  const clear = (): void => {
    setContextId(null);
    setProjectId(null);
    setStartOn(emptyDate);
    setDeadline(emptyDate);
  };

  /**
   * Saves, then says where the item went. It awaits the store rather than
   * using mutate's callbacks: those are dropped once the dialog closes,
   * which is before the store answers.
   */
  const finish = async (clarifyNow: boolean): Promise<void> => {
    try {
      await capture.mutateAsync({ notes, title: title.trim() });
    } catch (error) {
      toast({
        title:
          error instanceof Error
            ? errorText(error)
            : "Could not save the to-do.",
      });

      return;
    }

    if (clarifyNow && !organized) {
      go({ kind: "clarify", taskId: null });
    } else {
      toast({
        title: organized ? `Added to ${destination}` : "Saved to Inbox",
      });
    }
  };

  const save = (clarifyNow: boolean): void => {
    if (title.trim() === "") {
      return;
    }

    void finish(clarifyNow);
    onClose();
  };

  const contextItems: (MenuAction | "separator")[] = [
    {
      checked: contextId === null,
      label: "No context",
      onSelect: () => {
        setContextId(null);
      },
    },
    "separator",
    ...lookups.contexts.map((each) => ({
      checked: each.id === contextId,
      label: each.name,
      onSelect: () => {
        setContextId(each.id);
      },
    })),
  ];

  const projectItems: (MenuAction | "separator")[] = [
    {
      checked: projectId === null,
      label: "No project",
      onSelect: () => {
        setProjectId(null);
      },
    },
    "separator",
    ...lookups.projects.map((each) => ({
      checked: each.id === projectId,
      label: each.name,
      onSelect: () => {
        setProjectId(each.id);
      },
    })),
  ];

  return (
    <Dialog
      footer={
        <>
          <span {...stylex.props(styles.hints)}>
            <span {...stylex.props(styles.hint)}>
              <Kbd>↵</Kbd> Save to {destination}
            </span>
            {organized ? null : (
              <span {...stylex.props(styles.hint)}>
                <Kbd>⌘ ↵</Kbd> Save and clarify now
              </span>
            )}
            <span {...stylex.props(styles.hint)}>
              <Kbd>esc</Kbd> Cancel
            </span>
          </span>
          <span {...stylex.props(styles.spacer)} />
          <Button
            disabled={title.trim() === ""}
            onClick={() => {
              save(false);
            }}
            size="small"
            variant="primary"
          >
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
      title="Capture"
    >
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.titleRow)}>
          <span aria-hidden {...stylex.props(styles.icon)}>
            <CirclePlus size={20} />
          </span>
          <div {...stylex.props(styles.title)}>
            <TextField
              appearance="bare"
              autoFocus
              hideLabel
              label="What's on your mind?"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  save(event.metaKey);
                }
              }}
              onValueChange={setTitle}
              placeholder="What's on your mind?"
              value={title}
            />
          </div>
        </div>
        <div {...stylex.props(styles.aligned)}>
          <TextField
            appearance="quiet"
            hideLabel
            label="Notes"
            multiline
            onValueChange={setNotes}
            placeholder="Notes"
            value={notes}
          />
        </div>
        <div {...stylex.props(styles.chips, styles.aligned)}>
          <Chip
            active={!organized}
            aria-pressed={!organized}
            icon={<Inbox size={13} />}
            onClick={clear}
          >
            Inbox
          </Chip>
          <Menu
            align="start"
            items={contextItems}
            trigger={
              <Chip active={context !== undefined} icon={<AtSign size={13} />}>
                {context?.name ?? "Context"}
              </Chip>
            }
          />
          <DateChip
            description="It stays out of Next Actions until this day."
            icon={<Calendar size={13} />}
            label="Start on"
            name="When"
            onValueChange={setStartOn}
            shown={startOn === emptyDate ? "" : dayLabel(startOn)}
            value={startOn}
          />
          <DateChip
            description="Only if it is a real deadline."
            icon={<Flag size={13} />}
            label="Deadline"
            name="Deadline"
            onValueChange={setDeadline}
            shown={deadline === emptyDate ? "" : `Due ${shortDate(deadline)}`}
            value={deadline}
          />
          <Menu
            align="start"
            items={projectItems}
            trigger={
              <Chip active={project !== undefined} icon={<Folder size={13} />}>
                {project?.name ?? "Project"}
              </Chip>
            }
          />
        </div>
      </div>
    </Dialog>
  );
};

/** Capture from anywhere: the + button or ⌘N. Everything lands in the Inbox. */
export const QuickCaptureProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <QuickCaptureContext value={show}>
      {children}
      {open ? (
        <CaptureDialog
          onClose={() => {
            setOpen(false);
          }}
        />
      ) : null}
    </QuickCaptureContext>
  );
};

export const useQuickCapture = (): (() => void) => {
  const show = use(QuickCaptureContext);

  if (show === null) {
    throw new Error("useQuickCapture needs a QuickCaptureProvider above it.");
  }

  return show;
};
