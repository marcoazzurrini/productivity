import { Button, IconButton, Menu, Popover, TextField } from "@productivity/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ArrowRight,
  Calendar,
  Ellipsis,
  ListPlus,
  Plus,
  Search,
} from "lucide-react";
import { useState } from "react";
import { fn } from "storybook/test";

const meta = { title: "Components/Menus" } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const MoreMenu: Story = {
  render: () => (
    <Menu
      align="start"
      items={[
        { label: "New to-do", onSelect: fn(), shortcut: "⌘N" },
        { label: "New project", onSelect: fn() },
        "separator",
        { label: "Today's journal", onSelect: fn(), shortcut: "⌘J" },
        { label: "Hide calendar", onSelect: fn() },
      ]}
      trigger={<IconButton icon={<Ellipsis size={18} />} label="More" />}
    />
  ),
};

export const ChoiceMenu: Story = {
  render: () => (
    <Menu
      align="start"
      items={[
        { checked: true, label: "No project", onSelect: fn() },
        "separator",
        { label: "Prepare Presentation", onSelect: fn() },
        { label: "Vacation in Rome", onSelect: fn() },
      ]}
      trigger={
        <IconButton
          icon={<ArrowRight size={18} />}
          label="Move"
          size="large"
          tone="secondary"
        />
      }
    />
  ),
};

const WhenPopover = () => {
  const [date, setDate] = useState("");

  return (
    <Popover
      label="When"
      trigger={
        <IconButton
          icon={<Calendar size={18} />}
          label="When"
          size="large"
          tone="secondary"
        />
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: 220,
        }}
      >
        <TextField
          label="Start on"
          onValueChange={setDate}
          type="date"
          value={date}
        />
        <Button size="small" variant="primary">
          Save
        </Button>
      </div>
    </Popover>
  );
};

export const FieldPopover: Story = { render: () => <WhenPopover /> };

/** The bar under every page. A button with nothing to act on is disabled. */
export const Toolbar: Story = {
  render: () => (
    <div
      aria-label="To-do actions"
      role="toolbar"
      style={{ display: "flex", gap: 72, justifyContent: "center" }}
    >
      <IconButton
        icon={<Plus size={18} />}
        label="New to-do"
        size="large"
        tone="secondary"
      />
      <IconButton
        disabled
        focusableWhenDisabled
        icon={<ListPlus size={18} />}
        label="New heading: open a project first"
        size="large"
        tone="secondary"
      />
      <IconButton
        icon={<Search size={18} />}
        label="Quick find"
        size="large"
        tone="secondary"
      />
    </div>
  ),
};
