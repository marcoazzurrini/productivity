import {
  CountBadge,
  IconButton,
  NavItem,
  NavSection,
  Tag,
} from "@productivity/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Archive,
  CalendarDays,
  Hourglass,
  Inbox,
  ListChecks,
  Plus,
  RefreshCcw,
} from "lucide-react";
import { useState } from "react";

const meta = { title: "Patterns/Sidebar" } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const contexts = [
  { color: "#337EA9", count: 5, name: "@Computer" },
  { color: "#448361", count: 2, name: "@Calls" },
  { color: "#D9730D", count: 3, name: "@Errands" },
];

const Dot = ({ color }: { color: string }) => (
  <span
    style={{
      backgroundColor: color,
      borderRadius: "50%",
      display: "block",
      height: 8,
      width: 8,
    }}
  />
);

const SidebarDemo = () => {
  const [selected, setSelected] = useState("Inbox");

  const item = (label: string) => ({
    onSelect: () => {
      setSelected(label);
    },
    selected: selected === label,
  });

  return (
    <nav
      aria-label="Lists"
      style={{
        background: "#F8F8F7",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        padding: 8,
        width: 280,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "4px 8px 12px",
        }}
      >
        <IconButton icon={<Plus size={18} />} label="New to-do" tone="accent" />
      </div>
      <NavItem
        count={7}
        icon={<Inbox color="#0582FF" size={16} />}
        label="Inbox"
        {...item("Inbox")}
      />
      <NavItem
        count={14}
        icon={<ListChecks color="#1F9C8E" size={16} />}
        label="Next Actions"
        {...item("Next Actions")}
      />
      <NavItem
        icon={<CalendarDays color="#D44C47" size={16} />}
        label="Upcoming"
        {...item("Upcoming")}
      />
      <NavItem
        badge={<CountBadge count={2} label="2 to follow up" />}
        count={5}
        icon={<Hourglass color="#D9730D" size={16} />}
        label="Waiting For"
        {...item("Waiting For")}
      />
      <NavItem
        count={4}
        icon={<Archive color="#CB912F" size={16} />}
        label="Someday / Maybe"
        {...item("Someday")}
      />
      <NavSection>Contexts</NavSection>
      {contexts.map((context) => (
        <NavItem
          count={context.count}
          emphasis="quiet"
          icon={<Dot color={context.color} />}
          key={context.name}
          label={context.name}
          {...item(context.name)}
        />
      ))}
      <NavSection>Review</NavSection>
      <NavItem
        badge={<Tag tone="purple">Due Fri</Tag>}
        icon={<RefreshCcw color="#A46EE0" size={16} />}
        label="Weekly Review"
        {...item("Weekly Review")}
      />
    </nav>
  );
};

export const Sidebar: Story = { render: () => <SidebarDemo /> };
