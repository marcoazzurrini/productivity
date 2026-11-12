import { ChoiceCards, FilterSelect } from "@productivity/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Choice cards" } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const ClarifyQuestion = () => {
  const [value, setValue] = useState<string | null>("existing");
  const [project, setProject] = useState("rome");

  return (
    <div style={{ width: 640 }}>
      <ChoiceCards
        choices={[
          {
            description: "Goes to Next Actions",
            title: "No, just this action",
            value: "none",
          },
          {
            aside: (
              <FilterSelect
                label="Project"
                onValueChange={setProject}
                options={[
                  { label: "Vacation in Rome", value: "rome" },
                  { label: "Buy a New Car", value: "car" },
                ]}
                value={project}
              />
            ),
            description: "The project keeps track of what comes next",
            title: "Yes, add it to a project",
            value: "existing",
          },
          {
            description: "You will name the outcome and its first action",
            title: "Yes, start a new project",
            value: "new",
          },
        ]}
        label="Is it part of a bigger outcome?"
        numberShortcuts
        onValueChange={setValue}
        value={value}
      />
    </div>
  );
};

/** Press 1, 2 or 3 to choose. The selected card shows its picker. */
export const Clarify: Story = { render: () => <ClarifyQuestion /> };
