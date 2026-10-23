import {
  Checkbox,
  FilterSelect,
  SegmentedControl,
  TextField,
} from "@productivity/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Clock, MapPin } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Inputs" } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const CheckboxDemo = () => {
  const [checked, setChecked] = useState(false);

  return (
    <Checkbox
      checked={checked}
      label="Complete Draft slide outline"
      onCheckedChange={setChecked}
    />
  );
};

export const CheckboxStory: Story = {
  name: "Checkbox",
  render: () => <CheckboxDemo />,
};

const TextFieldDemo = () => {
  const [value, setValue] = useState("Compare fares");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16, width: 400 }}
    >
      <TextField
        description="Start with a verb: Call, Email, Buy, Draft…"
        label="Next action"
        onValueChange={setValue}
        value={value}
      />
      <TextField
        label="Notes"
        multiline
        onValueChange={setValue}
        value={value}
      />
      <TextField
        appearance="bare"
        hideLabel
        label="Title"
        onValueChange={setValue}
        value={value}
      />
    </div>
  );
};

export const TextFields: Story = { render: () => <TextFieldDemo /> };

const FilterDemo = () => {
  const [context, setContext] = useState("all");
  const [time, setTime] = useState("30");

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <FilterSelect
        icon={<MapPin size={13} />}
        label="Context"
        onValueChange={setContext}
        options={[
          { label: "All", value: "all" },
          { label: "@Computer", value: "computer" },
          { label: "@Calls", value: "calls" },
        ]}
        value={context}
      />
      <FilterSelect
        icon={<Clock size={13} />}
        label="Time"
        onValueChange={setTime}
        options={[
          { label: "Any", value: "any" },
          { label: "≤ 15 min", value: "15" },
          { label: "≤ 30 min", value: "30" },
        ]}
        value={time}
      />
    </div>
  );
};

export const FilterSelects: Story = { render: () => <FilterDemo /> };

const SegmentedDemo = () => {
  const [view, setView] = useState("week");
  const [person, setPerson] = useState("all");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SegmentedControl
        label="Calendar view"
        onValueChange={setView}
        options={[
          { label: "Day", value: "day" },
          { label: "Week", value: "week" },
          { label: "Month", value: "month" },
        ]}
        value={view}
      />
      <SegmentedControl
        label="Person"
        onValueChange={setPerson}
        options={[
          { label: "All", value: "all" },
          { label: "Diane", value: "diane" },
          { label: "Eric", value: "eric" },
        ]}
        value={person}
        variant="pills"
      />
    </div>
  );
};

export const SegmentedControls: Story = { render: () => <SegmentedDemo /> };
