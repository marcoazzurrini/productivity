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
          { title: "No, it stands alone", value: "none" },
          {
            description: "It moves an outcome you already track.",
            detail: (
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
            title: "Yes, add it to a project",
            value: "existing",
          },
          {
            description: "It needs more than one action to finish.",
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

/** Press 1, 2 or 3 to choose. The selected card reveals its extra fields. */
export const Clarify: Story = { render: () => <ClarifyQuestion /> };
