import { upcomingDays } from "@productivity/gtd";
import {
  EmptyState,
  PageHeader,
  SectionHeading,
  TaskList,
} from "@productivity/ui";
import { CalendarDays } from "lucide-react";

import { useOverview, useUpcoming } from "../data.ts";
import { dayLabel } from "../format.ts";
import { Page, Section } from "../page.tsx";
import { TaskItem } from "../task-item.tsx";

export const UpcomingScreen = () => {
  const today = useOverview().data?.today ?? "";
  const days = upcomingDays(useUpcoming().data ?? [], today);

  return (
    <Page>
      <PageHeader
        description="Actions that start later, and deadlines ahead. Deferred actions move to Next Actions on their start day."
        icon={<CalendarDays color="#D44C47" size={30} />}
        title="Upcoming"
      />
      {days.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={32} />}
          title="Nothing scheduled ahead"
        >
          Give an action a start date or deadline to see it here.
        </EmptyState>
      ) : (
        days.map((day) => (
          <Section key={day.date} label={dayLabel(day.date)}>
            <SectionHeading
              count={day.tasks.length}
              title={dayLabel(day.date)}
            />
            <TaskList label={dayLabel(day.date)}>
              {day.tasks.map((task) => (
                <TaskItem key={task.id} task={task} today={today} />
              ))}
            </TaskList>
          </Section>
        ))
      )}
    </Page>
  );
};
