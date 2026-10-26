import { WeekCalendar } from "@productivity/ui";
import type { CalendarEntry, CalendarRange } from "@productivity/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const blue = "#039BE5";
const purple = "#8E24AA";
const green = "#0B8043";

const noop = (): void => undefined;

const at = (day: number, time: string): string =>
  `2026-10-${String(day).padStart(2, "0")}T${time}`;

const event = (
  id: string,
  title: string,
  day: number,
  from: string,
  until: string,
  color = blue
): CalendarEntry => ({
  allDay: false,
  color,
  editable: true,
  end: at(day, until),
  id,
  kind: "event",
  start: at(day, from),
  title,
});

const initialEntries: CalendarEntry[] = [
  ...[19, 20, 21, 22, 23].map((day) =>
    event(`standup-${day}`, "Team standup", day, "09:00", "09:30")
  ),
  event("roadmap", "Deep work: roadmap", 19, "14:00", "16:00", purple),
  event("dentist", "Dentist", 21, "16:00", "17:00", green),
  event("sync", "Design sync", 22, "11:30", "12:30"),
  {
    ...event("dinner", "Dinner with Eve", 24, "19:30", "21:30", green),
    editable: false,
  },
  {
    allDay: false,
    detail: "Prepare Presentation",
    editable: true,
    end: at(22, "12:00"),
    id: "slides",
    kind: "task",
    start: at(22, "11:00"),
    title: "Draft slide outline",
  },
  {
    allDay: true,
    color: purple,
    editable: true,
    end: "2026-10-24",
    id: "q4",
    kind: "event",
    start: "2026-10-19",
    title: "Q4 planning week",
  },
];

/** A calendar that keeps what the user does, like the app does. */
const CalendarDemo = () => {
  const [entries, setEntries] = useState(initialEntries);

  const move = (id: string, range: CalendarRange): Promise<void> => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...range } : entry))
    );

    return Promise.resolve();
  };

  const create = (range: CalendarRange): void => {
    setEntries((current) => [
      ...current,
      {
        ...range,
        color: blue,
        editable: true,
        id: crypto.randomUUID(),
        kind: "event",
        title: "New event",
      },
    ]);
  };

  return (
    <div style={{ height: 900 }}>
      <WeekCalendar
        date="2026-10-23"
        entries={entries}
        onEntryChange={move}
        onNext={noop}
        onPrevious={noop}
        onSelectRange={create}
        onToday={noop}
        subtitle="Week 43"
        title="October 2026"
      />
    </div>
  );
};

const meta = {
  parameters: { layout: "fullscreen" },
  title: "Components/Week calendar",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Events in their calendar's color and a dashed time-blocked task. Click or
 * drag on empty slots to add an event; drag events to move or resize them.
 * Dinner is read-only, like an invitation.
 */
export const Week: Story = { render: () => <CalendarDemo /> };
