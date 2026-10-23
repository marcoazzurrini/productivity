import type { TagColor } from "@productivity/gtd";
import {
  CountBadge,
  IconButton,
  NavItem,
  NavSection,
  Tag,
} from "@productivity/ui";
import { color, space } from "@productivity/ui/tokens.stylex";
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
} from "lucide-react";
import { useState } from "react";

import { useAreas, useOverview } from "./data.ts";
import { dayLabel } from "./format.ts";
import { useLookups } from "./lookups.ts";
import { useNavigation } from "./navigation.tsx";
import { NewProjectDialog } from "./new-project-dialog.tsx";
import { ProjectPie } from "./project-pie.tsx";
import { useQuickCapture } from "./quick-capture.tsx";

const styles = stylex.create({
  dot: { borderRadius: "50%", height: 8, width: 8 },
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

const contextDot = {
  blue: "#337EA9",
  brown: "#9F6B53",
  gray: "#787774",
  green: "#448361",
  orange: "#D9730D",
  pink: "#C14C8A",
  purple: "#9065B0",
  red: "#D44C47",
  yellow: "#CB912F",
} as const satisfies Record<TagColor, string>;

export const Sidebar = () => {
  const { view, go } = useNavigation();
  const overview = useOverview().data;
  const areas = useAreas().data ?? [];
  const lookups = useLookups();
  const openCapture = useQuickCapture();
  const [creatingProject, setCreatingProject] = useState(false);

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
        <IconButton
          icon={<Plus size={18} />}
          label="New to-do (⌘N)"
          onClick={openCapture}
          tone="accent"
        />
      </div>
      <div {...stylex.props(styles.nav)}>
        <NavItem
          count={overview?.inbox}
          icon={<Inbox color="#0582FF" size={16} />}
          label="Inbox"
          onSelect={() => {
            go({ kind: "inbox" });
          }}
          selected={view.kind === "inbox" || view.kind === "clarify"}
        />
        <div {...stylex.props(styles.gap)} />
        <NavItem
          count={overview?.nextActions}
          icon={<ListChecks color="#1F9C8E" size={16} />}
          label="Next Actions"
          onSelect={() => {
            go({ contextId: null, kind: "next" });
          }}
          selected={view.kind === "next" && view.contextId === null}
        />
        <NavItem
          icon={<CalendarDays color="#D44C47" size={16} />}
          label="Upcoming"
          onSelect={() => {
            go({ kind: "upcoming" });
          }}
          selected={view.kind === "upcoming"}
        />
        <NavItem
          badge={
            overview !== undefined && overview.waitingDue > 0 ? (
              <CountBadge
                count={overview.waitingDue}
                label={`${overview.waitingDue} to follow up`}
              />
            ) : undefined
          }
          count={overview?.waiting}
          icon={<Hourglass color="#D9730D" size={16} />}
          label="Waiting For"
          onSelect={() => {
            go({ kind: "waiting" });
          }}
          selected={view.kind === "waiting"}
        />
        <NavItem
          count={overview?.someday}
          icon={<Archive color="#CB912F" size={16} />}
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
              <span
                {...stylex.props(styles.dot)}
                style={{ backgroundColor: contextDot[context.color] }}
              />
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
                icon={<Box color="#91918E" size={16} />}
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
        <NavItem
          badge={
            overview === undefined ? undefined : (
              <Tag tone={overview.review.due ? "purple" : "gray"}>
                {overview.review.due
                  ? `Due ${dayLabel(overview.review.dueOn).split(" ")[0] ?? ""}`
                  : "Done"}
              </Tag>
            )
          }
          icon={<RefreshCcw color="#A46EE0" size={16} />}
          label="Weekly Review"
          onSelect={() => {
            go({ kind: "review" });
          }}
          selected={view.kind === "review"}
        />
        <NavItem
          emphasis="quiet"
          icon={<Plus size={16} />}
          label="New Project"
          onSelect={() => {
            setCreatingProject(true);
          }}
        />
      </div>
      {creatingProject ? (
        <NewProjectDialog
          onClose={() => {
            setCreatingProject(false);
          }}
        />
      ) : null}
    </nav>
  );
};
