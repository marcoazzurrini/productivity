import { IconButton, NavItem, NavSection } from "@productivity/ui";
import {
  color,
  font,
  radius,
  space,
  tag,
} from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import {
  Archive,
  Box,
  CalendarDays,
  Hourglass,
  Inbox,
  ListChecks,
  Plus,
  RefreshCcw,
  Search,
} from "lucide-react";

import { useAreas, useOverview } from "./data.ts";
import { dayLabel } from "./format.ts";
import { useLookups } from "./lookups.ts";
import { useNavigation } from "./navigation.tsx";
import { useNewProject } from "./new-project-dialog.tsx";
import { ProjectPie } from "./project-pie.tsx";
import { useQuickCapture } from "./quick-capture.tsx";
import { useQuickFind } from "./quick-find.tsx";
import { ThemeSetting } from "./theme-setting.tsx";

const styles = stylex.create({
  actions: { alignItems: "center", display: "flex", gap: 6 },
  dot: {
    backgroundColor: "currentColor",
    borderRadius: "50%",
    height: 8,
    width: 8,
  },
  // Smaller than a Tag, so it fits the row without making it taller.
  due: {
    alignItems: "center",
    backgroundColor: tag.purpleBg,
    borderRadius: radius.sm,
    color: tag.purpleFg,
    display: "inline-flex",
    flexShrink: 0,
    fontSize: font.size11,
    fontWeight: font.weightSemibold,
    height: 20,
    paddingInline: 6,
  },
  dueDone: { backgroundColor: tag.grayBg, color: tag.grayFg },
  footer: {
    borderTopColor: color.borderDefault,
    borderTopStyle: "solid",
    borderTopWidth: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: space.s2,
  },
  gap: { height: space.s2 },
  icon: { display: "flex" },
  nav: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: 1,
    minHeight: 0,
    overflowY: "auto",
    paddingInline: space.s2,
  },
  root: {
    backgroundColor: color.bgSidebar,
    borderInlineEndColor: color.borderDefault,
    borderInlineEndStyle: "solid",
    borderInlineEndWidth: 1,
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    height: "100%",
    width: 280,
  },
  titlebar: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    height: 52,
    justifyContent: "flex-end",
    paddingInline: space.s4,
  },
});

const dark = "@media (prefers-color-scheme: dark)";

/**
 * Icon colors, as the design draws them in each theme. They are brighter
 * than the text tokens of the same hue, which are darkened to be readable.
 */
const tint = stylex.create({
  area: { color: { [dark]: "#7F7F7C", default: "#91918E" } },
  inbox: { color: { [dark]: "#2E86F5", default: "#0582FF" } },
  next: { color: { [dark]: "#3DB5A6", default: "#1F9C8E" } },
  review: { color: { [dark]: "#B285EA", default: "#A46EE0" } },
  someday: { color: { [dark]: "#DAB45A", default: "#CB912F" } },
  upcoming: { color: { [dark]: "#EC7A74", default: "#D44C47" } },
  waiting: { color: { [dark]: "#E79A55", default: "#D9730D" } },
});

const contextDot = stylex.create({
  blue: { color: { [dark]: "#62A8D4", default: "#337EA9" } },
  brown: { color: { [dark]: "#C08D76", default: "#9F6B53" } },
  gray: { color: { [dark]: "#9B9B98", default: "#787774" } },
  green: { color: { [dark]: "#6DB38A", default: "#448361" } },
  orange: { color: { [dark]: "#E79A55", default: "#D9730D" } },
  pink: { color: { [dark]: "#DA78AC", default: "#C14C8A" } },
  purple: { color: { [dark]: "#AE90D0", default: "#9065B0" } },
  red: { color: { [dark]: "#EC7A74", default: "#D44C47" } },
  yellow: { color: { [dark]: "#DAB45A", default: "#CB912F" } },
});

export const Sidebar = () => {
  const { view, go } = useNavigation();
  const overview = useOverview().data;
  const areas = useAreas().data ?? [];
  const lookups = useLookups();
  const openCapture = useQuickCapture();
  const openQuickFind = useQuickFind();
  const openNewProject = useNewProject();

  const contextCount = (id: string): number =>
    overview?.contexts.find((entry) => entry.id === id)?.count ?? 0;

  const areaGroups = [
    ...areas.map((area) => ({
      area,
      projects: lookups.projects.filter(
        (project) => project.areaId === area.id
      ),
    })),
    {
      area: null,
      projects: lookups.projects.filter((project) => project.areaId === null),
    },
  ].filter((group) => group.projects.length > 0);

  return (
    <nav aria-label="Lists" {...stylex.props(styles.root)}>
      <div className="drag-region" {...stylex.props(styles.titlebar)}>
        <span {...stylex.props(styles.actions)}>
          <IconButton
            icon={<Search size={16} />}
            label="Quick find (⌘P)"
            onClick={openQuickFind}
          />
          <IconButton
            icon={<Plus size={18} />}
            label="New to-do (⌘N)"
            onClick={openCapture}
            tone="accent"
          />
        </span>
      </div>
      <div {...stylex.props(styles.nav)}>
        <NavItem
          count={overview?.inbox}
          icon={
            <span {...stylex.props(styles.icon, tint.inbox)}>
              <Inbox size={16} />
            </span>
          }
          label="Inbox"
          onSelect={() => {
            go({ kind: "inbox" });
          }}
          selected={view.kind === "inbox" || view.kind === "clarify"}
        />
        <div {...stylex.props(styles.gap)} />
        <NavItem
          count={overview?.nextActions}
          icon={
            <span {...stylex.props(styles.icon, tint.next)}>
              <ListChecks size={16} />
            </span>
          }
          label="Next Actions"
          onSelect={() => {
            go({ contextId: null, kind: "next" });
          }}
          selected={view.kind === "next" && view.contextId === null}
        />
        <NavItem
          icon={
            <span {...stylex.props(styles.icon, tint.upcoming)}>
              <CalendarDays size={16} />
            </span>
          }
          label="Upcoming"
          onSelect={() => {
            go({ kind: "upcoming" });
          }}
          selected={view.kind === "upcoming"}
        />
        <NavItem
          count={overview?.waiting}
          icon={
            <span {...stylex.props(styles.icon, tint.waiting)}>
              <Hourglass size={16} />
            </span>
          }
          label="Waiting For"
          onSelect={() => {
            go({ kind: "waiting" });
          }}
          selected={view.kind === "waiting"}
        />
        <NavItem
          count={overview?.someday}
          icon={
            <span {...stylex.props(styles.icon, tint.someday)}>
              <Archive size={16} />
            </span>
          }
          label="Someday / Maybe"
          onSelect={() => {
            go({ kind: "someday" });
          }}
          selected={view.kind === "someday"}
        />

        <NavSection>Contexts</NavSection>
        {lookups.contexts.map((context) => (
          <NavItem
            count={contextCount(context.id)}
            emphasis="quiet"
            icon={
              <span {...stylex.props(styles.dot, contextDot[context.color])} />
            }
            key={context.id}
            label={context.name}
            onSelect={() => {
              go({ contextId: context.id, kind: "next" });
            }}
            selected={view.kind === "next" && view.contextId === context.id}
          />
        ))}

        <NavSection>Projects</NavSection>
        {areaGroups.map((group) => (
          <div key={group.area?.id ?? "no-area"}>
            {group.area === null ? null : (
              <NavItem
                emphasis="strong"
                icon={
                  <span {...stylex.props(styles.icon, tint.area)}>
                    <Box size={16} />
                  </span>
                }
                label={group.area.name}
              />
            )}
            {group.projects.map((project) => (
              <NavItem
                icon={
                  <ProjectPie
                    done={project.doneCount}
                    total={project.doneCount + project.openCount}
                  />
                }
                key={project.id}
                label={project.name}
                onSelect={() => {
                  go({ kind: "project", projectId: project.id });
                }}
                selected={
                  view.kind === "project" && view.projectId === project.id
                }
              />
            ))}
          </div>
        ))}
      </div>
      <div {...stylex.props(styles.footer)}>
        <ThemeSetting />
        <NavItem
          badge={
            overview === undefined ? undefined : (
              <span
                {...stylex.props(
                  styles.due,
                  !overview.review.due && styles.dueDone
                )}
              >
                {overview.review.due
                  ? `Due ${dayLabel(overview.review.dueOn).split(" ")[0] ?? ""}`
                  : "Done"}
              </span>
            )
          }
          icon={
            <span {...stylex.props(styles.icon, tint.review)}>
              <RefreshCcw size={16} />
            </span>
          }
          label="Weekly Review"
          onSelect={() => {
            go({ kind: "review" });
          }}
          selected={view.kind === "review"}
        />
        <NavItem
          emphasis="action"
          icon={<Plus size={16} />}
          label="New Project"
          onSelect={openNewProject}
        />
      </div>
    </nav>
  );
};
