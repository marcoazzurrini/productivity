import {
  Button,
  EmptyState,
  PageHeader,
  TaskList,
  TaskRow,
} from "@productivity/ui";
import { Archive, Play } from "lucide-react";

import { useSomeday, useStoreAction } from "../data.ts";
import { Page, Section } from "../page.tsx";
import { useTaskDialog } from "../task-dialog.tsx";

export const SomedayScreen = () => {
  const tasks = useSomeday().data ?? [];
  const openTask = useTaskDialog();
  const activate = useStoreAction((store, id: string) => store.activate(id));

  return (
    <Page>
      <PageHeader
        aside={`${tasks.length} ideas`}
        description="Ideas you might do one day. You review them in the Weekly Review and start any you are ready for."
        icon={<Archive color="#CB912F" size={30} />}
        title="Someday / Maybe"
      />
      {tasks.length === 0 ? (
        <EmptyState icon={<Archive size={32} />} title="No ideas parked">
          While clarifying, choose “Someday / Maybe” for things you might do
          later.
        </EmptyState>
      ) : (
        <Section label="Ideas">
          <TaskList label="Someday / Maybe">
            {tasks.map((task) => (
              <TaskRow
                actions={
                  <Button
                    icon={<Play size={13} />}
                    onClick={() => {
                      activate.mutate(task.id);
                    }}
                    size="small"
                    variant="outline"
                  >
                    Start now
                  </Button>
                }
                hasNotes={task.notes.length > 0}
                key={task.id}
                onOpen={() => {
                  openTask(task);
                }}
                revealActions
                title={task.title}
              />
            ))}
          </TaskList>
        </Section>
      )}
    </Page>
  );
};
