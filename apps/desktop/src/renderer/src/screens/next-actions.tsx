import { groupNextActions } from "@productivity/gtd";
import type { NextActionFilter } from "@productivity/gtd";
import {
  EmptyState,
  FilterSelect,
  PageHeader,
  SectionHeading,
  TaskList,
} from "@productivity/ui";
import { BatteryMedium, Clock, ListChecks, MapPin } from "lucide-react";
import { useState } from "react";

import { useNextActions, useOverview } from "../data.ts";
import { useLookups } from "../lookups.ts";
import { useNavigation } from "../navigation.tsx";
import { energyOptions, none, toEnergy, toMinutes } from "../options.ts";
import { Page, Row, Section } from "../page.tsx";
import { TaskItem } from "../task-item.tsx";

const timeOptions = [
  { label: "Any", value: none },
  { label: "≤ 5 min", value: "5" },
  { label: "≤ 15 min", value: "15" },
  { label: "≤ 30 min", value: "30" },
  { label: "≤ 1 hour", value: "60" },
];

export const NextActionsScreen = ({
  contextId,
}: {
  contextId: string | null;
}) => {
  const { go } = useNavigation();
  const lookups = useLookups();
  const tasks = useNextActions().data ?? [];
  const today = useOverview().data?.today ?? "";
  const [minutes, setMinutes] = useState(none);
  const [energy, setEnergy] = useState(none);

  const filter: NextActionFilter = {
    contextId,
    energy: toEnergy(energy),
    maxMinutes: toMinutes(minutes),
  };

  const groups = groupNextActions(tasks, lookups.contexts, filter, today);
  const shown = groups.reduce((sum, group) => sum + group.tasks.length, 0);
  const context = lookups.context(contextId);

  return (
    <Page>
      <PageHeader
        aside={`${shown} of ${tasks.length}`}
        description="Every concrete next step, grouped by where you can do it. Filter by the time and energy you have right now."
        icon={<ListChecks color="#1F9C8E" size={30} />}
        title={context === undefined ? "Next Actions" : context.name}
      >
        <Row>
          <FilterSelect
            icon={<MapPin size={13} />}
            label="Context"
            onValueChange={(value) => {
              go({ contextId: value === none ? null : value, kind: "next" });
            }}
            options={[
              { label: "All", value: none },
              ...lookups.contexts.map((item) => ({
                label: item.name,
                value: item.id,
              })),
            ]}
            value={contextId ?? none}
          />
          <FilterSelect
            icon={<Clock size={13} />}
            label="Time"
            onValueChange={setMinutes}
            options={timeOptions}
            value={minutes}
          />
          <FilterSelect
            icon={<BatteryMedium size={13} />}
            label="Energy"
            onValueChange={setEnergy}
            options={[{ label: "Any", value: none }, ...energyOptions.slice(1)]}
            value={energy}
          />
        </Row>
      </PageHeader>
      {groups.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={32} />}
          title="Nothing fits right now"
        >
          Try another context, or more time and energy.
        </EmptyState>
      ) : (
        groups.map((group) => {
          const title = group.context?.name ?? "No context";

          return (
            <Section key={group.context?.id ?? "none"} label={title}>
              <SectionHeading count={group.tasks.length} title={title} />
              <TaskList label={title}>
                {group.tasks.map((task) => (
                  <TaskItem
                    hideContext
                    key={task.id}
                    task={task}
                    today={today}
                  />
                ))}
              </TaskList>
            </Section>
          );
        })
      )}
    </Page>
  );
};
