import * as stylex from "@stylexjs/stylex";
import { FileText, Star } from "lucide-react";
import type { DragEvent, ReactNode } from "react";

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
  /** Opens the task. Makes the title a button. */
  onOpen?: () => void;
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
  hidden: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":hover")]: 1,
      [stylex.when.ancestor(":focus-within")]: 1,
    },
  },
  leading: { display: "flex", flexShrink: 0 },
  meta: {
    color: color.textTertiary,
    flexShrink: 1,
    fontSize: font.size13,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  notes: { color: color.textPlaceholder, display: "flex", flexShrink: 0 },
  row: {
    alignItems: "center",
    backgroundColor: { ":hover": color.bgSidebar, default: "transparent" },
    borderRadius: radius.md,
    display: "flex",
    fontFamily: font.family,
    gap: space.s3,
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
  star: { color: "#E2B203", display: "flex", flexShrink: 0 },
  subtitle: {
    color: color.textTertiary,
    fontSize: font.size12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tall: { minHeight: 56 },
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
    outline: "none",
    overflow: "hidden",
    padding: 0,
    textAlign: "start",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  titleDone: {
    color: color.textTertiary,
    textDecoration: "line-through",
  },
  titleLine: {
    alignItems: "center",
    display: "flex",
    gap: space.s2,
    minWidth: 0,
  },
});

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
  onOpen,
  dragId,
}: TaskRowProps) => {
  const isDone = done === true;
  const titleStyle = stylex.props(styles.title, isDone && styles.titleDone);

  const startDrag = (event: DragEvent<HTMLLIElement>): void => {
    if (dragId === undefined) {
      return;
    }

    event.dataTransfer.setData(taskDragType, dragId);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    // Dragging onto the calendar is a mouse shortcut; the app offers a
    // keyboard way to schedule too.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <li
      aria-current={selected ? "true" : undefined}
      draggable={dragId !== undefined}
      onDragStart={startDrag}
      {...stylex.props(
        styles.row,
        stylex.defaultMarker(),
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
          <Star aria-hidden fill="currentColor" size={14} />
          <VisuallyHidden>Starred</VisuallyHidden>
        </span>
      ) : null}
      <span {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.titleLine)}>
          {onOpen === undefined ? (
            <span {...titleStyle}>{title}</span>
          ) : (
            <button onClick={onOpen} type="button" {...titleStyle}>
              {title}
            </button>
          )}
          {hasNotes ? (
            <span {...stylex.props(styles.notes)}>
              <FileText aria-hidden size={13} />
              <VisuallyHidden>Has notes</VisuallyHidden>
            </span>
          ) : null}
        </span>
        {subtitle === undefined ? null : (
          <span {...stylex.props(styles.subtitle)}>{subtitle}</span>
        )}
      </span>
      {meta === undefined ? null : (
        <span {...stylex.props(styles.meta)}>{meta}</span>
      )}
      {tags}
      {actions === undefined ? null : (
        <span {...stylex.props(styles.actions, revealActions && styles.hidden)}>
          {actions}
        </span>
      )}
    </li>
  );
};

const listStyles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
  },
});

export const TaskList = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <ul aria-label={label} {...stylex.props(listStyles.list)}>
    {children}
  </ul>
);
