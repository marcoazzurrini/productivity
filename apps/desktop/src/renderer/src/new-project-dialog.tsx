import { Button, Dialog, FilterSelect, TextField } from "@productivity/ui";
import { space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { createContext, use, useCallback, useState } from "react";
import type { ReactNode } from "react";

import { useAreas, useStoreAction } from "./data.ts";
import { useNavigation } from "./navigation.tsx";
import { none, toDate, toId } from "./options.ts";

const styles = stylex.create({
  fields: { display: "flex", flexDirection: "column", gap: space.s3 },
  row: { display: "flex", gap: space.s3 },
  spacer: { flexGrow: 1 },
});

/** A project is any outcome that needs more than one action. */
const NewProjectDialog = ({ onClose }: { onClose: () => void }) => {
  const { go } = useNavigation();
  const areas = useAreas().data ?? [];
  const [name, setName] = useState("");
  const [outcome, setOutcome] = useState("");
  const [areaId, setAreaId] = useState(none);
  const [deadline, setDeadline] = useState("");

  const create = useStoreAction((store) =>
    store.createProject({
      areaId: toId(areaId),
      deadline: toDate(deadline),
      name: name.trim(),
      outcome: outcome.trim(),
    })
  );

  const submit = (): void => {
    if (name.trim() === "") {
      return;
    }

    create.mutate(null, {
      onSuccess: (project) => {
        go({ kind: "project", projectId: project.id });
      },
    });
    onClose();
  };

  return (
    <Dialog
      footer={
        <>
          <span {...stylex.props(styles.spacer)} />
          <Button onClick={onClose} size="small" variant="outline">
            Cancel
          </Button>
          <Button
            disabled={name.trim() === ""}
            onClick={submit}
            size="small"
            variant="primary"
          >
            Create project
          </Button>
        </>
      }
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
      showTitle
      title="New project"
      width={520}
    >
      <div {...stylex.props(styles.fields)}>
        <TextField
          autoFocus
          label="Name"
          onValueChange={setName}
          placeholder="Plan the team offsite"
          value={name}
        />
        <TextField
          description="What does done look like? You will know when to stop."
          label="Done when"
          onValueChange={setOutcome}
          placeholder="Venue booked and agenda shared"
          value={outcome}
        />
        <div {...stylex.props(styles.row)}>
          <FilterSelect
            label="Area"
            onValueChange={setAreaId}
            options={[
              { label: "None", value: none },
              ...areas.map((area) => ({ label: area.name, value: area.id })),
            ]}
            value={areaId}
          />
          <TextField
            label="Deadline"
            onValueChange={setDeadline}
            type="date"
            value={deadline}
          />
        </div>
      </div>
    </Dialog>
  );
};

const NewProjectContext = createContext<(() => void) | null>(null);

/** Lets the sidebar and the "…" menu open the same New project dialog. */
export const NewProjectProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <NewProjectContext value={show}>
      {children}
      {open ? (
        <NewProjectDialog
          onClose={() => {
            setOpen(false);
          }}
        />
      ) : null}
    </NewProjectContext>
  );
};

/** Opens the New project dialog. */
export const useNewProject = (): (() => void) => {
  const show = use(NewProjectContext);

  if (show === null) {
    throw new Error("useNewProject needs a NewProjectProvider above it.");
  }

  return show;
};
