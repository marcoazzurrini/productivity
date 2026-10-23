import {
  Banner,
  EmptyState,
  PageHeader,
  SectionHeading,
  Tag,
  TaskList,
  TextField,
} from "@productivity/ui";
import { color, font, radius, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { CircleAlert, Flag } from "lucide-react";
import { useState } from "react";

import { useOverview, useProject, useStoreAction } from "../data.ts";
import { shortDate } from "../format.ts";
import { Page, Section } from "../page.tsx";
import { ProjectPie } from "../project-pie.tsx";
import { TaskItem } from "../task-item.tsx";

const styles = stylex.create({
  doneWhen: {
    backgroundColor: color.bgSidebar,
    borderRadius: radius.lg,
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    gap: space.s1,
    padding: space.s4,
  },
  doneWhenLabel: {
    color: color.textTertiary,
    fontSize: font.size11,
    fontWeight: font.weightSemibold,
    letterSpacing: "0.04em",
  },
  doneWhenText: { color: color.textPrimary, fontSize: font.size15, margin: 0 },
});

export const ProjectScreen = ({ projectId }: { projectId: string }) => {
  const detail = useProject(projectId).data;
  const today = useOverview().data?.today ?? "";
  const [draft, setDraft] = useState("");

  const addAction = useStoreAction(async (store, title: string) => {
    const captured = await store.capture({ title });

    await store.clarify(captured.id, {
      kind: "action",
      owner: { kind: "me" },
      project: { kind: "existing", projectId },
      title,
      when: {
        contextId: null,
        deadline: null,
        energy: null,
        minutes: null,
        startOn: null,
      },
    });
  });

  if (detail === undefined) {
    return <Page>{null}</Page>;
  }

  if (detail === null) {
    return (
      <Page>
        <EmptyState title="Project not found">
          It may have been deleted.
        </EmptyState>
      </Page>
    );
  }

  const { project, area, tasks } = detail;

  const open = tasks.filter(
    (task) => task.completedAt === null && task.list === "next"
  );

  const waiting = tasks.filter(
    (task) => task.completedAt === null && task.list === "waiting"
  );

  const done = tasks.filter((task) => task.completedAt !== null);

  return (
    <Page>
      <PageHeader
        aside={
          project.deadline === null ? undefined : (
            <Tag
              icon={<Flag aria-hidden size={12} />}
              tone={project.deadline < today ? "red" : "gray"}
            >
              {shortDate(project.deadline)}
            </Tag>
          )
        }
        description={area === null ? undefined : `Area: ${area.name}`}
        icon={<ProjectPie done={done.length} total={tasks.length} />}
        title={project.name}
      />
      {project.outcome === "" ? null : (
        <div {...stylex.props(styles.doneWhen)}>
          <span {...stylex.props(styles.doneWhenLabel)}>DONE WHEN</span>
          <p {...stylex.props(styles.doneWhenText)}>{project.outcome}</p>
        </div>
      )}
      {open.length === 0 && waiting.length === 0 ? (
        <Banner
          description="Every active project needs a next action, or it stalls."
          icon={<CircleAlert size={18} />}
          title="This project has no next action"
        />
      ) : null}
      <Section label="Next actions">
        <SectionHeading count={open.length} title="Next actions" />
        <TaskList label="Next actions">
          {open.map((task) => (
            <TaskItem hideProject key={task.id} task={task} today={today} />
          ))}
        </TaskList>
        <form
          onSubmit={(event) => {
            event.preventDefault();

            if (draft.trim() !== "") {
              addAction.mutate(draft.trim());
              setDraft("");
            }
          }}
        >
          <TextField
            hideLabel
            label="Add a next action"
            onValueChange={setDraft}
            placeholder="+ Add a next action"
            value={draft}
          />
        </form>
      </Section>
      {waiting.length === 0 ? null : (
        <Section label="Waiting for">
          <SectionHeading count={waiting.length} title="Waiting for" />
          <TaskList label="Waiting for">
            {waiting.map((task) => (
              <TaskItem hideProject key={task.id} task={task} today={today} />
            ))}
          </TaskList>
        </Section>
      )}
      {done.length === 0 ? null : (
        <Section label="Done">
          <SectionHeading count={done.length} title="Done" />
          <TaskList label="Done">
            {done.map((task) => (
              <TaskItem hideProject key={task.id} task={task} today={today} />
            ))}
          </TaskList>
        </Section>
      )}
    </Page>
  );
};
