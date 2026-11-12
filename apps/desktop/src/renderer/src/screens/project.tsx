import {
  addDays,
  datePart,
  groupProjectTasks,
  isFollowUpDue,
  waitingTitle,
} from "@productivity/gtd";
import type { Heading, LocalDate, Task } from "@productivity/gtd";
import {
  Banner,
  EmptyState,
  IconButton,
  Menu,
  PageHeader,
  SectionHeading,
  Tag,
  TaskList,
  taskDragType,
} from "@productivity/ui";
import {
  color,
  font,
  radius,
  shadow,
  space,
  tag,
} from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Box, CircleAlert, Ellipsis, Flag } from "lucide-react";
import { useCallback, useState } from "react";
import type { DragEvent } from "react";

import { useCommandHandler } from "../commands.tsx";
import { useOverview, useProject, useStoreAction } from "../data.ts";
import { shortDate, weekdayLabel } from "../format.ts";
import { InlineEdit } from "../inline-edit.tsx";
import { Page } from "../page.tsx";
import { ProjectPie } from "../project-pie.tsx";
import { TaskItem } from "../task-item.tsx";

const styles = stylex.create({
  // The header's facts are a size up from the tags at the end of a row.
  chip: {
    alignItems: "center",
    borderRadius: radius.sm,
    display: "inline-flex",
    flexShrink: 0,
    fontSize: font.size12,
    fontWeight: font.weightMedium,
    gap: 6,
    height: 24,
    paddingInline: space.s2,
    whiteSpace: "nowrap",
  },
  chipArea: { backgroundColor: color.bgHover, color: color.textSecondary },
  chipDeadline: { backgroundColor: tag.orangeBg, color: tag.orangeFg },
  chipOverdue: { backgroundColor: tag.redBg, color: tag.redFg },
  doneCount: { color: color.textTertiary, fontSize: font.size12 },
  empty: {
    color: color.textTertiary,
    fontFamily: font.family,
    fontSize: font.size13,
    margin: 0,
    paddingBlock: space.s2,
    paddingInline: space.s2,
  },
  facts: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: space.s2,
  },
  // The heading's title while it is renamed: the same line, as a field.
  headingEdit: {
    alignItems: "flex-end",
    borderBottomColor: color.borderDefault,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    color: color.textLink,
    display: "flex",
    fontFamily: font.family,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
    minHeight: 40,
    paddingBottom: space.s2,
  },
  // The button is wider than its icon: these margins put the icon where
  // the design has it, at the row's right edge, without a taller row.
  headingMenu: {
    color: color.textLink,
    marginBlock: -5,
    marginInlineEnd: -5,
  },
  notes: {
    color: color.textSecondary,
    fontSize: font.size15,
    lineHeight: "22px",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  outcome: {
    backgroundColor: tag.greenBg,
    borderInlineStartColor: tag.greenFg,
    borderInlineStartStyle: "solid",
    borderInlineStartWidth: 3,
    borderRadius: radius.md,
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    gap: space.s1,
    paddingBlock: 10,
    paddingInline: 14,
  },
  outcomeLabel: {
    color: tag.greenFg,
    fontSize: font.size11,
    fontWeight: font.weightSemibold,
    letterSpacing: "0.3px",
  },
  outcomeText: {
    color: color.textPrimary,
    fontSize: font.size14,
    lineHeight: "20px",
    margin: 0,
  },
  section: { display: "flex", flexDirection: "column", gap: 6 },
  showCompleted: {
    alignSelf: "flex-start",
    backgroundColor: "transparent",
    borderRadius: radius.sm,
    borderStyle: "none",
    boxShadow: { ":focus-visible": shadow.focus, default: null },
    color: { ":hover": color.textSecondary, default: color.textTertiary },
    cursor: "pointer",
    fontFamily: font.family,
    fontSize: font.size13,
    fontWeight: font.weightMedium,
    outline: "none",
    padding: 0,
  },
  // Pulls the icon to the design's 12 px from the title.
  titleMenu: { marginInlineStart: -4 },
});

/** "Follow up Tue" within the week, and the date when it is further off or past. */
const followUpLabel = (followUpOn: LocalDate, today: LocalDate): string =>
  followUpOn > today && followUpOn < addDays(today, 7)
    ? `Follow up ${weekdayLabel(followUpOn)}`
    : `Follow up ${shortDate(followUpOn)}`;

/** Something the project waits on: who owes it, since when, and when to chase. */
const WaitingRow = ({ task, today }: { task: Task; today: LocalDate }) => (
  <TaskItem
    hideProject
    meta={`Asked ${shortDate(datePart(task.capturedAt))}`}
    tags={
      task.followUpOn === null || task.completedAt !== null ? (
        []
      ) : (
        <Tag size="small" tone={isFollowUpDue(task, today) ? "red" : "neutral"}>
          {followUpLabel(task.followUpOn, today)}
        </Tag>
      )
    }
    task={task}
    title={waitingTitle(task)}
    today={today}
  />
);

/** Lets a dragged task row be dropped here. */
const acceptDrag = (event: DragEvent<HTMLElement>): void => {
  if (event.dataTransfer.types.includes(taskDragType)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }
};

/**
 * A group of the project's actions. Dropping a to-do's row on it moves the
 * to-do under its heading; the task dialog does the same by keyboard.
 */
const ActionSection = ({
  heading,
  tasks,
  today,
  renaming,
  onRenamingChange,
}: {
  /** Null for the to-dos that sit under no heading. */
  heading: Heading | null;
  tasks: Task[];
  today: LocalDate;
  renaming: boolean;
  onRenamingChange: (renaming: boolean) => void;
}) => {
  const headingId = heading?.id ?? null;

  const move = useStoreAction((store, taskId: string) =>
    store.updateTask(taskId, { headingId })
  );

  const rename = useStoreAction((store, input: { id: string; title: string }) =>
    store.renameHeading(input.id, input.title)
  );

  const remove = useStoreAction((store, id: string) => store.deleteHeading(id));

  const drop = (event: DragEvent<HTMLElement>): void => {
    const taskId = event.dataTransfer.getData(taskDragType);

    if (taskId !== "" && !tasks.some((task) => task.id === taskId)) {
      event.preventDefault();
      move.mutate(taskId);
    }
  };

  const label = heading?.title ?? "To-dos";

  return (
    // Dropping rows is a mouse shortcut; the task dialog's Heading field is
    // the keyboard way.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      aria-label={label}
      onDragOver={acceptDrag}
      onDrop={drop}
      {...stylex.props(styles.section)}
    >
      {heading !== null && renaming ? (
        <div {...stylex.props(styles.headingEdit)}>
          <InlineEdit
            initialValue={heading.title}
            label="Heading title"
            onCancel={() => {
              onRenamingChange(false);
            }}
            onSave={(title) => {
              // An emptied title keeps the old one: a heading needs a name.
              if (title !== "" && title !== heading.title) {
                rename.mutate({ id: heading.id, title });
              }

              onRenamingChange(false);
            }}
          />
        </div>
      ) : null}
      {heading !== null && !renaming ? (
        <SectionHeading
          actions={
            <Menu
              items={[
                {
                  label: "Rename",
                  onSelect: () => {
                    onRenamingChange(true);
                  },
                },
                {
                  label: "Delete heading",
                  onSelect: () => {
                    remove.mutate(heading.id);
                  },
                },
              ]}
              trigger={
                <IconButton
                  icon={<Ellipsis size={18} />}
                  label={`${heading.title} options`}
                  xstyle={styles.headingMenu}
                />
              }
            />
          }
          count={tasks.length}
          title={heading.title}
        />
      ) : null}
      {tasks.length === 0 ? (
        <p {...stylex.props(styles.empty)}>
          No to-dos here yet. Drag one in, or pick this heading in a to-do.
        </p>
      ) : (
        <TaskList label={label}>
          {tasks.map((task) => (
            <TaskItem hideProject key={task.id} task={task} today={today} />
          ))}
        </TaskList>
      )}
    </section>
  );
};

export const ProjectScreen = ({ projectId }: { projectId: string }) => {
  const detail = useProject(projectId).data;
  const today = useOverview().data?.today ?? "";
  /** The heading whose title is being edited, if any. */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);

  const { mutate: createHeading } = useStoreAction((store, title: string) =>
    store.createHeading(projectId, title)
  );

  const saveNotes = useStoreAction((store, notes: string) =>
    store.updateProject(projectId, { notes })
  );

  // A new heading starts with a placeholder title, already being renamed.
  const newHeading = useCallback((): void => {
    createHeading("New heading", {
      onSuccess: (heading) => {
        setRenamingId(heading.id);
      },
    });
  }, [createHeading]);

  // The toolbar's New heading button works while a project is open.
  useCommandHandler("new-heading", newHeading);

  if (detail === undefined) {
    return <Page>{null}</Page>;
  }

  if (detail === null) {
    return (
      <Page>
        <EmptyState title="Project not found">
          It may have been deleted.
        </EmptyState>
      </Page>
    );
  }

  const { project, area, tasks, headings } = detail;
  const groups = groupProjectTasks(tasks, headings, today);

  const hasOpenWork = [
    ...groups.sections.flatMap((section) => section.tasks),
    ...groups.waiting,
  ].some((task) => task.completedAt === null);

  const earlierLabel = `${groups.earlier.length} completed ${groups.earlier.length === 1 ? "to-do" : "to-dos"}`;

  return (
    <Page>
      <PageHeader
        icon={
          <ProjectPie
            done={groups.doneCount}
            size={30}
            tone="accent"
            total={groups.totalCount}
          />
        }
        title={project.name}
        titleAction={
          <Menu
            align="start"
            items={[
              { label: "New heading", onSelect: newHeading },
              {
                label: project.notes === "" ? "Add notes" : "Edit notes",
                onSelect: () => {
                  setEditingNotes(true);
                },
              },
            ]}
            trigger={
              <IconButton
                icon={<Ellipsis size={20} />}
                label="Project options"
                xstyle={styles.titleMenu}
              />
            }
          />
        }
      >
        <div {...stylex.props(styles.facts)}>
          {area === null ? null : (
            <span {...stylex.props(styles.chip, styles.chipArea)}>
              <Box aria-hidden size={13} />
              {area.name}
            </span>
          )}
          {project.deadline === null ? null : (
            <span
              {...stylex.props(
                styles.chip,
                project.deadline < today
                  ? styles.chipOverdue
                  : styles.chipDeadline
              )}
            >
              <Flag aria-hidden size={13} />
              Deadline {shortDate(project.deadline)}
            </span>
          )}
          <span {...stylex.props(styles.doneCount)}>
            {groups.doneCount} of {groups.totalCount} done
          </span>
        </div>
        {editingNotes ? (
          <div {...stylex.props(styles.notes)}>
            <InlineEdit
              initialValue={project.notes}
              label="Project notes"
              multiline
              onCancel={() => {
                setEditingNotes(false);
              }}
              onSave={(notes) => {
                if (notes !== project.notes) {
                  saveNotes.mutate(notes);
                }

                setEditingNotes(false);
              }}
            />
          </div>
        ) : null}
        {!editingNotes && project.notes !== "" ? (
          <p {...stylex.props(styles.notes)}>{project.notes}</p>
        ) : null}
        {project.outcome === "" ? null : (
          <div {...stylex.props(styles.outcome)}>
            <span {...stylex.props(styles.outcomeLabel)}>DONE WHEN</span>
            <p {...stylex.props(styles.outcomeText)}>{project.outcome}</p>
          </div>
        )}
      </PageHeader>
      {hasOpenWork ? null : (
        <Banner
          description="Every active project needs a next action, or it stalls."
          icon={<CircleAlert size={18} />}
          title="This project has no next action"
        />
      )}
      {groups.sections.map((section) => (
        <ActionSection
          heading={section.heading}
          key={section.heading?.id ?? "no-heading"}
          onRenamingChange={(renaming) => {
            setRenamingId(renaming ? (section.heading?.id ?? null) : null);
          }}
          renaming={
            section.heading !== null && section.heading.id === renamingId
          }
          tasks={section.tasks}
          today={today}
        />
      ))}
      {groups.waiting.length === 0 ? null : (
        <section aria-label="Waiting for" {...stylex.props(styles.section)}>
          <SectionHeading count={groups.waiting.length} title="Waiting for" />
          <TaskList label="Waiting for">
            {groups.waiting.map((task) => (
              <WaitingRow key={task.id} task={task} today={today} />
            ))}
          </TaskList>
        </section>
      )}
      {groups.earlier.length === 0 ? null : (
        <section
          aria-label="Completed to-dos"
          {...stylex.props(styles.section)}
        >
          <button
            aria-expanded={showEarlier}
            onClick={() => {
              setShowEarlier((shown) => !shown);
            }}
            type="button"
            {...stylex.props(styles.showCompleted)}
          >
            {showEarlier ? "Hide" : "Show"} {earlierLabel}
          </button>
          {showEarlier ? (
            <TaskList label="Completed to-dos">
              {groups.earlier.map((task) => (
                <TaskItem hideProject key={task.id} task={task} today={today} />
              ))}
            </TaskList>
          ) : null}
        </section>
      )}
    </Page>
  );
};
