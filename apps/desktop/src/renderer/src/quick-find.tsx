import type { Task } from "@productivity/gtd";
import { Dialog, Kbd } from "@productivity/ui";
import { color, font, radius, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import {
  Archive,
  AtSign,
  CalendarDays,
  Circle,
  Hourglass,
  Inbox,
  ListChecks,
  RefreshCcw,
  Search,
} from "lucide-react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import type { KeyboardEvent, ReactNode } from "react";

import {
  useInbox,
  useNextActions,
  useSomeday,
  useUpcoming,
  useWaiting,
} from "./data.ts";
import { useLookups } from "./lookups.ts";
import type { Lookups } from "./lookups.ts";
import { useNavigation } from "./navigation.tsx";
import type { View } from "./navigation.tsx";
import { ProjectPie } from "./project-pie.tsx";
import { useSelection } from "./selection.tsx";

const QuickFindContext = createContext<(() => void) | null>(null);

const styles = stylex.create({
  empty: {
    color: color.textTertiary,
    fontSize: font.size13,
    margin: 0,
    paddingBlock: space.s3,
    paddingInline: space.s2,
  },
  group: {
    color: color.textTertiary,
    fontSize: font.size11,
    fontWeight: font.weightSemibold,
    letterSpacing: "0.3px",
    paddingBottom: space.s1,
    paddingInline: space.s2,
    paddingTop: space.s3,
    textTransform: "uppercase",
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
  icon: {
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    flexShrink: 0,
    height: 16,
    justifyContent: "center",
    width: 16,
  },
  input: {
    "::placeholder": { color: color.textPlaceholder },
    backgroundColor: "transparent",
    borderStyle: "none",
    color: color.textPrimary,
    flexGrow: 1,
    fontFamily: font.family,
    fontSize: 18,
    fontWeight: font.weightMedium,
    minWidth: 0,
    outline: "none",
    padding: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    listStyle: "none",
    margin: 0,
    marginTop: space.s2,
    maxHeight: 360,
    overflowY: "auto",
    padding: 0,
  },
  meta: {
    color: color.textTertiary,
    flexShrink: 0,
    fontSize: font.size12,
  },
  option: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: radius.md,
    color: color.textPrimary,
    cursor: "default",
    display: "flex",
    fontSize: font.size14,
    gap: 10,
    height: 32,
    paddingInline: space.s2,
  },
  optionActive: { backgroundColor: color.bgHover },
  optionLabel: {
    flexGrow: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  search: {
    alignItems: "center",
    display: "flex",
    gap: space.s3,
  },
  searchIcon: { color: color.accent, display: "flex", flexShrink: 0 },
});

/** One thing Quick find can open. */
interface Result {
  id: string;
  group: "Lists" | "Contexts" | "Projects" | "To-dos";
  label: string;
  /** Quiet text at the end of the row, such as a to-do's project. */
  meta?: string;
  icon: ReactNode;
  view: View;
  /** The to-do to select on arrival. */
  taskId?: string;
}

const lists: Result[] = [
  {
    group: "Lists",
    icon: <Inbox size={16} />,
    id: "list:inbox",
    label: "Inbox",
    view: { kind: "inbox" },
  },
  {
    group: "Lists",
    icon: <ListChecks size={16} />,
    id: "list:next",
    label: "Next Actions",
    view: { contextId: null, kind: "next" },
  },
  {
    group: "Lists",
    icon: <CalendarDays size={16} />,
    id: "list:upcoming",
    label: "Upcoming",
    view: { kind: "upcoming" },
  },
  {
    group: "Lists",
    icon: <Hourglass size={16} />,
    id: "list:waiting",
    label: "Waiting For",
    view: { kind: "waiting" },
  },
  {
    group: "Lists",
    icon: <Archive size={16} />,
    id: "list:someday",
    label: "Someday / Maybe",
    view: { kind: "someday" },
  },
  {
    group: "Lists",
    icon: <RefreshCcw size={16} />,
    id: "list:review",
    label: "Weekly Review",
    view: { kind: "review" },
  },
];

const listNames: Record<Task["list"], string> = {
  inbox: "Inbox",
  next: "Next Actions",
  reference: "Reference",
  someday: "Someday / Maybe",
  waiting: "Waiting For",
};

/** Where a to-do shows: its project if it has one, otherwise its list. */
const viewOf = (task: Task, upcoming: ReadonlySet<string>): View => {
  if (task.projectId !== null) {
    return { kind: "project", projectId: task.projectId };
  }

  if (upcoming.has(task.id)) {
    return { kind: "upcoming" };
  }

  switch (task.list) {
    case "next": {
      return { contextId: null, kind: "next" };
    }

    case "waiting": {
      return { kind: "waiting" };
    }

    case "someday": {
      return { kind: "someday" };
    }

    default: {
      return { kind: "inbox" };
    }
  }
};

/** With nothing typed, the places to go. To-dos show once there is a query. */
const mostToDos = 20;

/** True when the text holds every word of the query, in any order. */
const matches = (text: string, words: readonly string[]): boolean => {
  const lower = text.toLowerCase();

  return words.every((word) => lower.includes(word));
};

const findResults = (
  query: string,
  lookups: Lookups,
  tasks: readonly Task[],
  upcoming: ReadonlySet<string>
): Result[] => {
  const words = query.toLowerCase().split(/\s+/u).filter(Boolean);

  const places: Result[] = [
    ...lists,
    ...lookups.contexts.map((context): Result => ({
      group: "Contexts",
      icon: <AtSign size={15} />,
      id: `context:${context.id}`,
      label: context.name,
      view: { contextId: context.id, kind: "next" },
    })),
    ...lookups.projects.map((project): Result => ({
      group: "Projects",
      icon: (
        <ProjectPie
          done={project.doneCount}
          total={project.doneCount + project.openCount}
        />
      ),
      id: `project:${project.id}`,
      label: project.name,
      view: { kind: "project", projectId: project.id },
    })),
  ];

  if (words.length === 0) {
    return places.filter((place) => place.group !== "Contexts");
  }

  const toDos = tasks
    .filter((task) => matches(`${task.title} ${task.notes}`, words))
    .slice(0, mostToDos)
    .map((task): Result => ({
      group: "To-dos",
      icon: <Circle size={14} />,
      id: `task:${task.id}`,
      label: task.title,
      meta: lookups.project(task.projectId)?.name ?? listNames[task.list],
      taskId: task.id,
      view: viewOf(task, upcoming),
    }));

  return [...places.filter((place) => matches(place.label, words)), ...toDos];
};

const ResultRow = ({
  result,
  id,
  active,
  heading,
  onHover,
  onOpen,
}: {
  result: Result;
  id: string;
  active: boolean;
  heading?: string;
  onHover: () => void;
  onOpen: () => void;
}) => (
  <>
    {heading === undefined ? null : (
      <li role="presentation" {...stylex.props(styles.group)}>
        {heading}
      </li>
    )}
    {/* The field keeps the focus and handles the keys; rows take the mouse. A
        native option cannot hold an icon and a second column. */}
    {/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus, jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role */}
    <li
      aria-selected={active}
      id={id}
      onClick={onOpen}
      onMouseMove={onHover}
      role="option"
      {...stylex.props(styles.option, active && styles.optionActive)}
    >
      <span aria-hidden {...stylex.props(styles.icon)}>
        {result.icon}
      </span>
      <span {...stylex.props(styles.optionLabel)}>{result.label}</span>
      {result.meta === undefined ? null : (
        <span {...stylex.props(styles.meta)}>{result.meta}</span>
      )}
    </li>
    {/* oxlint-enable jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus, jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role */}
  </>
);

const QuickFindDialog = ({ onClose }: { onClose: () => void }) => {
  const { go } = useNavigation();
  const { select } = useSelection();
  const lookups = useLookups();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inbox = useInbox().data ?? [];
  const nextActions = useNextActions().data ?? [];
  const upcomingTasks = useUpcoming().data ?? [];
  const waiting = useWaiting().data ?? [];
  const someday = useSomeday().data ?? [];

  // A to-do can be in two lists, such as Next Actions and Upcoming.
  const tasks = [
    ...new Map(
      [...inbox, ...nextActions, ...upcomingTasks, ...waiting, ...someday].map(
        (task) => [task.id, task]
      )
    ).values(),
  ];

  const results = findResults(
    query,
    lookups,
    tasks,
    new Set(upcomingTasks.map((task) => task.id))
  );

  // The list can shrink under the highlighted row as the user types.
  const current = Math.min(active, Math.max(results.length - 1, 0));

  const open = (result: Result): void => {
    go(result.view);

    if (result.taskId !== undefined) {
      select(result.taskId);
    }

    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();

      const result = results[current];

      if (result !== undefined) {
        open(result);
      }
    }
  };

  const optionId = (index: number): string => `${listId}-${index}`;

  return (
    <Dialog
      footer={
        <span {...stylex.props(styles.hints)}>
          <span {...stylex.props(styles.hint)}>
            <Kbd>↑↓</Kbd> Move
          </span>
          <span {...stylex.props(styles.hint)}>
            <Kbd>↵</Kbd> Open
          </span>
          <span {...stylex.props(styles.hint)}>
            <Kbd>esc</Kbd> Close
          </span>
        </span>
      }
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      open
      title="Quick find"
    >
      <div {...stylex.props(styles.search)}>
        <span aria-hidden {...stylex.props(styles.searchIcon)}>
          <Search size={20} />
        </span>
        <input
          aria-activedescendant={
            results.length === 0 ? undefined : optionId(current)
          }
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded
          aria-label="Quick find"
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- the field is the reason the dialog opened.
          autoFocus
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Find a to-do, project or list"
          role="combobox"
          type="text"
          value={query}
          {...stylex.props(styles.input)}
        />
      </div>
      {results.length === 0 ? (
        <p {...stylex.props(styles.empty)}>Nothing matches “{query}”.</p>
      ) : null}
      {/* A native select cannot be driven from a text field. */}
      {/* oxlint-disable jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role */}
      <ul
        aria-label="Results"
        id={listId}
        role="listbox"
        {...stylex.props(styles.list)}
      >
        {results.map((result, index) => (
          <ResultRow
            active={index === current}
            // A group's name shows above its first row.
            heading={
              results[index - 1]?.group === result.group
                ? undefined
                : result.group
            }
            id={optionId(index)}
            key={result.id}
            onHover={() => {
              setActive(index);
            }}
            onOpen={() => {
              open(result);
            }}
            result={result}
          />
        ))}
      </ul>
      {/* oxlint-enable jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role */}
    </Dialog>
  );
};

/**
 * Quick find, from anywhere: the search buttons or ⌘P. It finds to-dos,
 * projects, contexts and lists, and goes to the one you choose.
 */
export const QuickFindProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.metaKey && event.key.toLowerCase() === "p") {
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
    <QuickFindContext value={show}>
      {children}
      {open ? (
        <QuickFindDialog
          onClose={() => {
            setOpen(false);
          }}
        />
      ) : null}
    </QuickFindContext>
  );
};

/** Opens Quick find. */
export const useQuickFind = (): (() => void) => {
  const show = use(QuickFindContext);

  if (show === null) {
    throw new Error("useQuickFind needs a QuickFindProvider above it.");
  }

  return show;
};
