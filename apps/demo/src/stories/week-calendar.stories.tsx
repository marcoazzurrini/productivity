import { WeekCalendar } from "@productivity/ui";
import type { CalendarItem } from "@productivity/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
  (weekday, index) => ({
    dayNumber: 20 + index,
    isToday: index === 3,
    key: `2026-10-${20 + index}`,
    weekday,
  })
);

const hour = (value: number): number => value * 60;

const initialItems: CalendarItem[] = [
  ...[0, 1, 2, 3, 4].map((dayIndex) => ({
    dayIndex,
    endMinute: hour(9.5),
    id: `standup-${dayIndex}`,
    kind: "meeting" as const,
    startMinute: hour(9),
    title: "Team standup",
  })),
  {
    dayIndex: 0,
    detail: "2:00 – 4:00 PM",
    endMinute: hour(16),
    id: "roadmap",
    kind: "focus",
    startMinute: hour(14),
    title: "Deep work: roadmap",
  },
  {
    dayIndex: 2,
    detail: "4:00 – 5:00 PM",
    endMinute: hour(17),
    id: "dentist",
    kind: "personal",
    startMinute: hour(16),
    title: "Dentist",
  },
  {
    dayIndex: 3,
    detail: "11:00 AM – 12:00 PM · Prepare Presentation",
    endMinute: hour(12),
    id: "slides",
    kind: "task",
    startMinute: hour(11),
    title: "Draft slide outline",
  },
  {
    dayIndex: 3,
    detail: "11:30 AM – 12:30 PM",
    endMinute: hour(12.5),
    id: "overlap",
    kind: "meeting",
    startMinute: hour(11.5),
    title: "Design sync",
  },
  {
    dayIndex: 5,
    detail: "7:30 – 9:30 PM",
    endMinute: hour(21.5),
    id: "dinner",
    kind: "personal",
    startMinute: hour(19.5),
    title: "Dinner with Eve",
  },
];

const CalendarDemo = () => (
  <div style={{ height: 900 }}>
    <WeekCalendar
      allDay={[
        {
          endIndex: 4,
          id: "q4",
          startIndex: 0,
          title: "Q4 planning week",
          tone: "purple",
        },
        {
          endIndex: 5,
          id: "bday",
          startIndex: 5,
          title: "Eve's birthday",
          tone: "pink",
        },
      ]}
      days={days}
      items={initialItems}
      nowMinute={hour(14) + 40}
      onNext={fn()}
      onPrevious={fn()}
      onToday={fn()}
      subtitle="Week 43"
      title="October 2026"
    />
  </div>
);

const meta = {
  parameters: { layout: "fullscreen" },
  title: "Components/Week calendar",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Meetings, focus time, personal events and dashed time-blocked tasks. Overlaps share the column. */
export const Week: Story = { render: () => <CalendarDemo /> };
