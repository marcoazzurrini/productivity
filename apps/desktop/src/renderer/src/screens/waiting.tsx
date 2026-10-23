import { datePart, groupWaiting } from "@productivity/gtd";
import type { Task } from "@productivity/gtd";
import {
  Avatar,
  Button,
  EmptyState,
  PageHeader,
  SectionHeading,
  SegmentedControl,
  Tag,
  TaskList,
  TaskRow,
  useToast,
} from "@productivity/ui";
import type { Tone } from "@productivity/ui";
import { Bell, Hourglass, ListPlus, UserRoundPlus } from "lucide-react";
import { useState } from "react";

import { useOverview, useStoreAction, useWaiting } from "../data.ts";
import { dayLabel, shortDate } from "../format.ts";
import { useLookups } from "../lookups.ts";
import { Hint, Page, Section } from "../page.tsx";
import { useTaskDialog } from "../task-dialog.tsx";

const avatarTones: Tone[] = [
  "blue",
  "green",
  "pink",
  "purple",
  "orange",
  "brown",
];

/** The same person always gets the same color. */
const toneFor = (name: string): Tone =>
  avatarTones[
    [...name].reduce((sum, letter) => sum + (letter.codePointAt(0) ?? 0), 0) %
      avatarTones.length
  ] ?? "gray";

const everyone = "everyone";

export const WaitingScreen = () => {
  const toast = useToast();
  const lookups = useLookups();
  const openTask = useTaskDialog();
  const today = useOverview().data?.today ?? "";
  const tasks = useWaiting().data ?? [];
  const [person, setPerson] = useState(everyone);

  const people = [
    ...new Set(
      tasks.flatMap((task) => (task.waitingOn === null ? [] : [task.waitingOn]))
    ),
  ].toSorted();

  const visible =
    person === everyone
      ? tasks
      : tasks.filter((task) => task.waitingOn === person);

  const groups = groupWaiting(visible, today);

  const received = useStoreAction((store, id: string) =>
    store.setCompleted(id, true)
  );

  const undoFollowUp = useStoreAction(
    async (store, input: { actionId: string; waiting: Task }) => {
      await store.deleteTask(input.actionId);
      await store.updateTask(input.waiting.id, {
        followUpOn: input.waiting.followUpOn,
      });
    }
  );

  const followUp = useStoreAction((store, waiting: Task) =>
    store.followUp(waiting.id)
  );

  const row = (task: Task, due: boolean) => (
    <TaskRow
      actions={
        due ? (
          <Button
            icon={<ListPlus size={14} />}
            onClick={() => {
              followUp.mutate(task, {
                onSuccess: (action) => {
                  toast({
                    action: {
                      label: "Undo",
                      onAction: () => {
                        undoFollowUp.mutate({
                          actionId: action.id,
                          waiting: task,
                        });
                      },
                    },
                    title: `Added "${action.title}" to Next Actions`,
                  });
                },
              });
            }}
            size="small"
            variant="outline"
          >
            Follow up
          </Button>
        ) : undefined
      }
      done={false}
      key={task.id}
      leading={
        <Avatar
          name={task.waitingOn ?? "?"}
          tone={toneFor(task.waitingOn ?? "?")}
        />
      }
      onDoneChange={() => {
        received.mutate(task.id);
      }}
      onOpen={() => {
        openTask(task);
      }}
      subtitle={[
        task.waitingOn,
        `asked ${shortDate(datePart(task.capturedAt))}`,
        lookups.project(task.projectId)?.name,
      ]
        .filter((part) => part !== undefined && part !== null)
        .join(" · ")}
      tags={
        task.followUpOn === null ? undefined : (
          <Tag
            icon={<Bell aria-hidden size={12} />}
            tone={due ? "red" : "gray"}
          >
            {due ? shortDate(task.followUpOn) : dayLabel(task.followUpOn)}
          </Tag>
        )
      }
      title={task.title}
    />
  );

  return (
    <Page>
      <PageHeader
        description="Things you handed off or expect from someone else. Each has a follow-up date, so nothing slips. Tick an item when it arrives."
        icon={<Hourglass color="#D9730D" size={30} />}
        title="Waiting For"
      >
        {people.length > 1 ? (
          <SegmentedControl
            label="Person"
            onValueChange={setPerson}
            options={[
              { label: "All", value: everyone },
              ...people.map((name) => ({
                label: name.split(" ")[0] ?? name,
                value: name,
              })),
            ]}
            value={person}
            variant="pills"
          />
        ) : null}
      </PageHeader>
      {visible.length === 0 ? (
        <EmptyState
          icon={<Hourglass size={32} />}
          title="Not waiting on anyone"
        >
          Items land here when you choose “Someone else” while clarifying.
        </EmptyState>
      ) : (
        <>
          {groups.due.length === 0 ? null : (
            <Section label="Follow up now">
              <SectionHeading count={groups.due.length} title="Follow up now" />
              <TaskList label="Follow up now">
                {groups.due.map((task) => row(task, true))}
              </TaskList>
            </Section>
          )}
          {groups.later.length === 0 ? null : (
            <Section label="Waiting">
              <SectionHeading count={groups.later.length} title="Waiting" />
              <TaskList label="Waiting">
                {groups.later.map((task) => row(task, false))}
              </TaskList>
            </Section>
          )}
          <Hint icon={<UserRoundPlus aria-hidden size={14} />}>
            Items land here when you choose “Someone else” while clarifying.
          </Hint>
        </>
      )}
    </Page>
  );
};
