import { Avatar, Button, Tag, TaskList, TaskRow } from "@productivity/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Bell, ListPlus, Mail } from "lucide-react";
import { useState } from "react";
import { fn } from "storybook/test";

const meta = {
  args: { title: "Draft slide outline" },
  component: TaskRow,
  decorators: [
    (Story) => (
      <div style={{ width: 640 }}>
        <TaskList label="Example">
          <Story />
        </TaskList>
      </div>
    ),
  ],
  title: "Components/Task row",
} satisfies Meta<typeof TaskRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NextAction: Story = {
  args: {
    done: false,
    hasNotes: true,
    meta: "Prepare Presentation",
    tags: (
      <>
        <Tag variant="outline">@Computer</Tag>
        <Tag tone="accent">11:00 AM</Tag>
      </>
    ),
  },
};

export const Starred: Story = {
  args: {
    done: false,
    meta: "Q4 Planning",
    starred: true,
    title: "Write first draft of Q4 goals",
  },
};

export const Overdue: Story = {
  args: {
    done: false,
    tags: <Tag tone="red">Oct 21</Tag>,
    title: "Send invoice to Acme",
  },
};

export const Done: Story = {
  args: { done: true, title: "Send agenda for Design Weekly" },
};

export const InboxItem: Story = {
  args: {
    actions: (
      <Button icon={<ArrowRight size={14} />} size="small" variant="primary">
        Clarify
      </Button>
    ),
    leading: <Mail color="#91918E" size={15} />,
    meta: "Mail · 8:12 AM",
    onOpen: fn(),
    revealActions: true,
    title: "Book flights for Rome trip",
  },
};

export const WaitingFor: Story = {
  args: {
    actions: (
      <Button icon={<ListPlus size={14} />} size="small" variant="outline">
        Follow up
      </Button>
    ),
    done: false,
    leading: <Avatar name="Eric Chen" tone="blue" />,
    subtitle: "Eric Chen · asked Oct 14 · Q4 Planning",
    tags: (
      <Tag icon={<Bell size={12} />} tone="red">
        Oct 21
      </Tag>
    ),
    title: "Final budget numbers",
  },
};

const tasks = [
  {
    context: "@Computer",
    id: "a",
    project: "Prepare Presentation",
    title: "Draft slide outline",
  },
  {
    context: "@Computer",
    id: "b",
    project: "Onboard James",
    title: "Reply to James about laptop setup",
  },
  {
    context: "@Computer",
    id: "c",
    project: "Vacation in Rome",
    title: "Compare fares for April 12–19",
  },
];

const ListDemo = () => {
  const [done, setDone] = useState<string[]>([]);

  return (
    <>
      {tasks.map((task) => (
        <TaskRow
          done={done.includes(task.id)}
          dragId={task.id}
          key={task.id}
          meta={task.project}
          onDoneChange={(next) => {
            setDone((ids) =>
              next ? [...ids, task.id] : ids.filter((id) => id !== task.id)
            );
          }}
          title={task.title}
        />
      ))}
    </>
  );
};

/** Tick tasks to see the done state. Rows can be dragged onto a WeekCalendar. */
export const List: Story = { render: () => <ListDemo /> };
