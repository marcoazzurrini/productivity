import { IconButton, Menu } from "@productivity/ui";
import { color, font, radius, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Ellipsis, PanelRight } from "lucide-react";
import type { ReactNode } from "react";

import { AgentToggle } from "./agent-toggle.tsx";
import { DayNav, useTodaysJournal } from "./day-nav.tsx";
import { MainToolbar } from "./main-toolbar.tsx";
import { useNewProject } from "./new-project-dialog.tsx";
import { useQuickCapture } from "./quick-capture.tsx";
import { useQuickFind } from "./quick-find.tsx";
import { useWeekPane } from "./week-pane.tsx";

const styles = stylex.create({
  // The design spaces the bare icons 16 px apart and 20 px from the edge.
  // Their buttons are wider than the icons, so the gaps here are smaller
  // by that much and the icons land in the same places.
  actions: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    gap: 5,
    marginInlineEnd: -5,
    marginInlineStart: "auto",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 28,
    maxWidth: 640,
    paddingBottom: space.s20,
    width: "100%",
  },
  dayNav: { display: "flex", marginInlineEnd: 5 },
  scroll: {
    display: "flex",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 0,
    overflowY: "auto",
    paddingInline: space.s8,
    paddingTop: space.s10,
  },
  topbar: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    height: 52,
    paddingInline: space.s5,
  },
});

/**
 * What the top bar holds unless a page brings its own: the journal's day
 * buttons, the agent's switch, the switch for the week pane, and a menu of
 * things to start.
 */
const TopbarActions = () => {
  const weekPane = useWeekPane();
  const openCapture = useQuickCapture();
  const openNewProject = useNewProject();
  const openQuickFind = useQuickFind();
  const openJournal = useTodaysJournal();
  const weekPaneLabel = weekPane.shown ? "Hide calendar" : "Show calendar";

  return (
    <span {...stylex.props(styles.actions)}>
      <span {...stylex.props(styles.dayNav)}>
        <DayNav />
      </span>
      <AgentToggle />
      <IconButton
        icon={<PanelRight size={16} />}
        label={weekPaneLabel}
        onClick={() => {
          weekPane.toggle();
        }}
      />
      <Menu
        items={[
          { label: "New to-do", onSelect: openCapture, shortcut: "⌘N" },
          { label: "New project", onSelect: openNewProject },
          "separator",
          { label: "Today's journal", onSelect: openJournal, shortcut: "⌘J" },
          { label: "Quick find", onSelect: openQuickFind, shortcut: "⌘P" },
          "separator",
          { label: weekPaneLabel, onSelect: weekPane.toggle },
        ]}
        trigger={<IconButton icon={<Ellipsis size={18} />} label="More" />}
      />
    </span>
  );
};

/**
 * The center pane's frame: a drag strip for the window, then content held
 * to a 640 px reading column, an optional footer pinned below it, and the
 * main toolbar at the very bottom.
 *
 * - `topbar` replaces everything in the top bar. Without it the bar shows
 *   the journal's day buttons, the week pane's switch and the "…" menu at
 *   its right end.
 * - `progress` sits between the top bar and the content, full width.
 * - `footer` is pinned under the content, above the toolbar.
 */
export const Page = ({
  topbar,
  progress,
  footer,
  children,
}: {
  topbar?: ReactNode;
  progress?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) => (
  <>
    <div className="drag-region" {...stylex.props(styles.topbar)}>
      {topbar ?? <TopbarActions />}
    </div>
    {progress}
    <div {...stylex.props(styles.scroll)}>
      <div {...stylex.props(styles.column)}>{children}</div>
    </div>
    {footer}
    <MainToolbar />
  </>
);

const sectionStyles = stylex.create({
  section: { display: "flex", flexDirection: "column", gap: 6 },
});

/** A titled group of rows inside a page. */
export const Section = ({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) => (
  <section aria-label={label} {...stylex.props(sectionStyles.section)}>
    {children}
  </section>
);

const hintStyles = stylex.create({
  hint: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: color.bgSidebar,
    borderRadius: radius.md,
    color: color.textTertiary,
    display: "flex",
    fontFamily: font.family,
    fontSize: font.size12,
    gap: space.s2,
    margin: 0,
    paddingBlock: 6,
    paddingInline: 10,
  },
  row: { display: "flex", flexWrap: "wrap", gap: space.s2 },
});

/** A quiet explanation under a list. */
export const Hint = ({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) => (
  <p {...stylex.props(hintStyles.hint)}>
    {icon}
    {children}
  </p>
);

/** Filters or buttons laid out in a wrapping row. */
export const Row = ({ children }: { children: ReactNode }) => (
  <div {...stylex.props(hintStyles.row)}>{children}</div>
);
