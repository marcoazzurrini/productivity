import { Button, IconButton } from "@productivity/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Plus } from "lucide-react";

const meta = {
  argTypes: {
    size: { control: "inline-radio", options: ["large", "small"] },
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary", "ghost", "outline"],
    },
  },
  args: { children: "Start clarifying", size: "large", variant: "primary" },
  component: Button,
  title: "Components/Button",
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const WithShortcut: Story = { args: { shortcut: "C" } };

export const WithIcon: Story = {
  args: { children: "Clarify", icon: <ArrowRight size={14} />, size: "small" },
};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 12 }}>
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="outline">
        Outline
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true } };

export const IconButtons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <IconButton icon={<Plus size={18} />} label="New to-do" tone="accent" />
      <IconButton icon={<Plus size={16} />} label="Add" />
    </div>
  ),
};
