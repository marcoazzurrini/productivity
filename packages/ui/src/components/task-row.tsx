import * as stylex from "@stylexjs/stylex";
import { FileText, Star } from "lucide-react";
import type { DragEvent, MouseEvent, ReactNode } from "react";

import {
  color,
  font,
  motion,
  radius,
  shadow,
  space,
} from "../tokens.stylex.ts";
import { Checkbox } from "./checkbox.tsx";
import { VisuallyHidden } from "./visually-hidden.tsx";

/** The drag data type a task row sets, and a calendar accepts. */
export const taskDragType = "application/x-productivity-task";

export interface TaskRowProps {
  title: string;
  /** Leave undefined for rows that cannot be ticked, such as inbox items. */
  done?: boolean;
  onDoneChange?: (done: boolean) => void;
  starred?: boolean;
  hasNotes?: boolean;
  /** A second line under the title, for who and when. */
  subtitle?: string;
  /** Quiet text before the tags, usually the project name. */
  meta?: string;
  /** Shown instead of a checkbox, such as an avatar or a source icon. */
  leading?: ReactNode;
  /** Context and date tags. */
  tags?: ReactNode;
  /** Actions at the end of the row. */
  actions?: ReactNode;
  /** Show the actions only while the row is hovered or focused. */
  revealActions?: boolean;
  selected?: boolean;
  /**
   * Selects the row. With it, a click selects and a double click, or Enter
   * on the title, opens. Without it, a click on the title opens.
   */
  onSelect?: () => void;
  /** Opens the task. Makes the title a button. */
  onOpen?: () => void;
  /** "medium" is a little taller, for rows without a checkbox. */
  size?: "default" | "medium";
  /** Lets the row be dragged onto the calendar with this id. */
  dragId?: string;
}

const styles = stylex.create({
  actions: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    gap: space.s2,
  },
  // Shown in place of the meta text while the row is hovered or focused.
  // It stays in the layout, so the keyboard can still reach its buttons.
  hidden: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":hover")]: 1,
      [stylex.when.ancestor(":focus-within")]: 1,
    },
  },
  leading: {
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    flexShrink: 0,
    justifyContent: "center",
    minWidth: 16,
  },
  medium: { minHeight: 40, paddingInline: 10 },
  meta: {
    color: color.textTertiary,
    flexShrink: 1,
    fontSize: font.size13,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // Gives way to the actions that appear over it.
  metaHidden: {
    opacity: {
      default: 1,
      [stylex.when.ancestor(":hover")]: 0,
      [stylex.when.ancestor(":focus-within")]: 0,
    },
  },
  notes: { color: color.textPlaceholder, display: "flex", flexShrink: 0 },
  row: {
    alignItems: "center",
    backgroundColor: { ":hover": color.bgHover, default: "transparent" },
    borderRadius: radius.md,
    display: "flex",
    fontFamily: font.family,
    gap: 10,
    listStyle: "none",
    minHeight: 36,
    paddingInline: space.s2,
    transitionDuration: motion.fast,
    transitionProperty: "background-color",
  },
  selected: {
    backgroundColor: {
      ":hover": color.accentSubtle,
      default: color.accentSubtle,
    },
  },
  star: { color: color.star, display: "flex", flexShrink: 0 },
  subtitle: {
    color: color.textTertiary,
    fontSize: font.size12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // The meta text and the actions share one cell, right-aligned, so the
  // actions can take the meta's place without moving anything else.
  swap: {
    alignItems: "center",
    display: "grid",
    flexShrink: 0,
    justifyItems: "end",
  },
  swapCell: { gridArea: "1 / 1" },
  tall: { gap: space.s3, minHeight: 56 },
  text: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    backgroundColor: "transparent",
    borderRadius: radius.sm,
    borderStyle: "none",
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    color: color.textPrimary,
    cursor: "default",
    fontFamily: font.family,
    fontSize: font.size14,
    lineHeight: "20px",
    outline: "none",
    overflow: "hidden",
    padding: 0,
    textAlign: "start",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  titleDone: { color: color.textTertiary },
  titleLine: {
    alignItems: "center",
    display: "flex",
    gap: space.s2,
    minWidth: 0,
  },
});

/** True for a click on the checkbox or an action, which do their own thing. */
const isOnControl = (event: MouseEvent<HTMLLIElement>): boolean => {
  const control =
    event.target instanceof HTMLElement
      ? event.target.closest<HTMLElement>("button, [role='checkbox']")
      : null;

  return control !== null && control.dataset.rowTitle === undefined;
};

/** The title, as a button when the row can be opened. */
const RowTitle = ({
  title,
  isDone,
  onSelect,
  onOpen,
}: Pick<TaskRowProps, "title" | "onSelect" | "onOpen"> & {
  isDone: boolean;
}) => {
  const titleStyle = stylex.props(styles.title, isDone && styles.titleDone);

  if (onOpen === undefined) {
    return <span {...titleStyle}>{title}</span>;
  }

  return (
    <button
      data-row-title
      onClick={(event) => {
        // A selectable row opens from the keyboard (a click with no
        // pointer) or a double click; a plain click only selects.
        if (onSelect === undefined || event.detail === 0) {
          onOpen();
        }
      }}
      onFocus={onSelect}
      type="button"
      {...titleStyle}
    >
      {title}
    </button>
  );
};

/** What follows the title: quiet text, tags and actions. */
const RowEnd = ({
  meta,
  tags,
  actions,
  revealActions,
}: Pick<TaskRowProps, "meta" | "tags" | "actions" | "revealActions">) => {
  if (revealActions === true) {
    return (
      <>
        {tags}
        <span {...stylex.props(styles.swap)}>
          {meta === undefined ? null : (
            <span
              {...stylex.props(styles.meta, styles.swapCell, styles.metaHidden)}
            >
              {meta}
            </span>
          )}
          <span
            {...stylex.props(styles.actions, styles.swapCell, styles.hidden)}
          >
            {actions}
          </span>
        </span>
      </>
    );
  }

  return (
    <>
      {meta === undefined ? null : (
        <span {...stylex.props(styles.meta)}>{meta}</span>
      )}
      {tags}
      {actions === undefined ? null : (
        <span {...stylex.props(styles.actions)}>{actions}</span>
      )}
    </>
  );
};

/** One task in a list. Use inside TaskList. */
export const TaskRow = ({
  title,
  done,
  onDoneChange,
  starred = false,
  hasNotes = false,
  subtitle,
  meta,
  leading,
  tags,
  actions,
  revealActions = false,
  selected = false,
  onSelect,
  onOpen,
  size = "default",
  dragId,
}: TaskRowProps) => {
  const isDone = done === true;

  const startDrag = (event: DragEvent<HTMLLIElement>): void => {
    if (dragId === undefined) {
      return;
    }

    event.dataTransfer.setData(taskDragType, dragId);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    // Dragging onto the calendar, and clicking anywhere on the row, are
    // mouse shortcuts. The keyboard selects a row by moving focus to its
    // title, opens it with Enter, and schedules it from the task dialog.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <li
      aria-current={selected ? "true" : undefined}
      draggable={dragId !== undefined}
      onClick={(event) => {
        if (!isOnControl(event)) {
          onSelect?.();
        }
      }}
      onDoubleClick={(event) => {
        if (onSelect !== undefined && !isOnControl(event)) {
          onOpen?.();
        }
      }}
      onDragStart={startDrag}
      {...stylex.props(
        styles.row,
        stylex.defaultMarker(),
        size === "medium" && styles.medium,
        subtitle !== undefined && styles.tall,
        selected && styles.selected
      )}
    >
      {done === undefined ? null : (
        <Checkbox
          checked={isDone}
          label={`Complete ${title}`}
          onCheckedChange={(next) => onDoneChange?.(next)}
        />
      )}
      {leading === undefined ? null : (
        <span {...stylex.props(styles.leading)}>{leading}</span>
      )}
      {starred ? (
        <span {...stylex.props(styles.star)}>
          <Star aria-hidden fill="currentColor" size={16} />
          <VisuallyHidden>Starred</VisuallyHidden>
        </span>
      ) : null}
      <span {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.titleLine)}>
          <RowTitle
            isDone={isDone}
            onOpen={onOpen}
            onSelect={onSelect}
            title={title}
          />
          {hasNotes ? (
            <span {...stylex.props(styles.notes)}>
              <FileText aria-hidden size={14} />
              <VisuallyHidden>Has notes</VisuallyHidden>
            </span>
          ) : null}
        </span>
        {subtitle === undefined ? null : (
          <span {...stylex.props(styles.subtitle)}>{subtitle}</span>
        )}
      </span>
      <RowEnd
        actions={actions}
        meta={meta}
        revealActions={revealActions}
        tags={tags}
      />
    </li>
  );
};

const listStyles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    margin: 0,
    padding: 0,
  },
  tight: { gap: 0 },
});

export const TaskList = ({
  label,
  tight = false,
  children,
}: {
  label: string;
  /** No gap between rows, for two-line rows that already have air. */
  tight?: boolean;
  children: ReactNode;
}) => (
  <ul
    aria-label={label}
    {...stylex.props(listStyles.list, tight && listStyles.tight)}
  >
    {children}
  </ul>
);
