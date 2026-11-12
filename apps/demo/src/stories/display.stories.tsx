import {
  Avatar,
  Banner,
  Button,
  CountBadge,
  EmptyState,
  Kbd,
  PageHeader,
  ProgressBar,
  ProgressSteps,
  SectionHeading,
  Tag,
} from "@productivity/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, Inbox, Package, Split } from "lucide-react";
import { fn } from "storybook/test";

const meta = { title: "Components/Display" } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tags: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Tag variant="outline">@Computer</Tag>
      <Tag size="small" tone="accent">
        5:30 PM
      </Tag>
      <Tag size="small" tone="red">
        Oct 21
      </Tag>
      <Tag size="small" tone="neutral">
        30m
      </Tag>
      <Tag tone="neutral">23 actions</Tag>
      <Tag icon={<Bell size={12} />} tone="red">
        Oct 22
      </Tag>
      <Tag tone="purple">Due Fri</Tag>
    </div>
  ),
};

export const Avatars: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Avatar name="Eric Chen" tone="blue" />
      <Avatar name="James Park" tone="green" />
      <Avatar name="Diane Moss" tone="pink" />
      <Avatar icon={<Package size={15} />} name="Apple Store" />
    </div>
  ),
};

export const SmallPieces: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
      <Kbd>⌘N</Kbd>
      <Kbd>esc</Kbd>
      <CountBadge count={2} label="2 to follow up" />
    </div>
  ),
};

export const Headers: Story = {
  render: () => (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 32, width: 640 }}
    >
      <PageHeader
        aside="7 items"
        description="Everything you capture lands here, unsorted. Nothing in the Inbox is a commitment yet."
        icon={<Inbox color="#0582FF" size={30} />}
        title="Inbox"
      />
      <SectionHeading count={2} title="Follow up now" />
      <SectionHeading
        count="2 of 3"
        menu={[
          { label: "Tick all", onSelect: fn() },
          { label: "Untick all", onSelect: fn() },
        ]}
        title="Get clear"
      />
    </div>
  ),
};

export const BannerStory: Story = {
  name: "Banner",
  render: () => (
    <div style={{ width: 640 }}>
      <Banner
        action={<Button variant="primary">Start clarifying</Button>}
        actionHint="or press C"
        description="Go through them one at a time. For each, decide what it is and what happens next."
        icon={<Split size={22} />}
        title="7 items to clarify"
      />
    </div>
  ),
};

export const Progress: Story = {
  render: () => (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 24, width: 640 }}
    >
      <ProgressSteps
        caption="Item 3 of 7"
        done={2}
        label="Clarifying the Inbox"
        total={7}
      />
      <ProgressBar
        caption="4 of 10 steps"
        done={4}
        label="Weekly Review progress"
        tone="violet"
        total={10}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <EmptyState icon={<Inbox size={32} />} title="Inbox zero">
      Everything is clarified. Capture new thoughts with ⌘N.
    </EmptyState>
  ),
};
