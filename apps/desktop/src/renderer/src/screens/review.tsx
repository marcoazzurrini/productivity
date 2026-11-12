import {
  nextReviewOn,
  addDays,
  reviewPhases,
  reviewSteps,
} from "@productivity/gtd";
import type { Overview, ReviewPhase, ReviewStepId } from "@productivity/gtd";
import {
  Button,
  Checkbox,
  PageHeader,
  ProgressBar,
  SectionHeading,
  Tag,
  useToast,
} from "@productivity/ui";
import { color, font, radius, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { ArrowRight, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";

import { useOverview, useReview, useStoreAction } from "../data.ts";
import { dayLabel, dayLabelWithComma } from "../format.ts";
import { useLookups } from "../lookups.ts";
import type { View } from "../navigation.tsx";
import { useNavigation } from "../navigation.tsx";
import { Page } from "../page.tsx";

const styles = stylex.create({
  // The step to do now with a button of its own: clarifying the Inbox.
  current: { backgroundColor: color.accentSubtle },
  finish: { display: "flex" },
  hint: { color: color.textTertiary, fontSize: font.size12 },
  icon: { color: color.illustrationViolet, display: "flex" },
  list: {
    display: "flex",
    flexDirection: "column",
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  // Looks like a link, so a row of them stays quiet beside the checklist.
  open: {
    backgroundColor: {
      ":active": color.bgPressed,
      ":hover": color.bgHover,
      default: "transparent",
    },
    color: color.textLink,
    gap: 4,
    height: 26,
    paddingInline: space.s2,
  },
  section: { display: "flex", flexDirection: "column", gap: space.s1 },
  start: { gap: 4, height: 26, paddingInline: space.s2 },
  step: {
    alignItems: "center",
    borderRadius: radius.md,
    display: "flex",
    fontFamily: font.family,
    gap: space.s3,
    minHeight: 48,
    paddingInline: space.s2,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: 1,
    minWidth: 0,
  },
  title: { color: color.textPrimary, fontSize: font.size14 },
  titleCurrent: { fontWeight: font.weightMedium },
  titleDone: { color: color.textTertiary },
});

/** What a step shows at its right end until it is ticked. */
interface StepExtras {
  /** A live number from the list the step reviews. */
  tag?: { label: string; urgent: boolean };
  /** Where the step's work happens, so the review can jump there. */
  destination?: { label: string; view: View };
  /** Stands out as the thing to do now. */
  current?: boolean;
}

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/** The live numbers and links for the steps that review a list. */
const extrasFor = (
  overview: Overview,
  stalled: readonly { id: string }[],
  firstProjectId: string | undefined
): Partial<Record<ReviewStepId, StepExtras>> => {
  const projectId = stalled[0]?.id ?? firstProjectId;

  return {
    inbox:
      overview.inbox === 0
        ? {}
        : {
            current: true,
            destination: {
              label: "Start clarifying",
              view: { kind: "clarify", taskId: null },
            },
            tag: { label: `${overview.inbox} left`, urgent: false },
          },
    "next-actions": {
      destination: { label: "Open", view: { contextId: null, kind: "next" } },
      tag: {
        label: plural(overview.nextActions, "action", "actions"),
        urgent: false,
      },
    },
    projects: {
      destination:
        projectId === undefined
          ? undefined
          : { label: "Open", view: { kind: "project", projectId } },
      tag:
        stalled.length === 0
          ? undefined
          : {
              label: `${stalled.length} ${
                stalled.length === 1 ? "has" : "have"
              } no next action`,
              urgent: true,
            },
    },
    someday: {
      destination: { label: "Open", view: { kind: "someday" } },
      tag: { label: plural(overview.someday, "idea", "ideas"), urgent: false },
    },
    "waiting-for": {
      destination: { label: "Open", view: { kind: "waiting" } },
      tag:
        overview.waitingDue > 0
          ? { label: `${overview.waitingDue} to follow up`, urgent: true }
          : { label: `${overview.waiting} waiting`, urgent: false },
    },
  };
};

const Step = ({
  title,
  hint,
  done,
  extras,
  onDoneChange,
  onOpen,
}: {
  title: string;
  hint: string;
  done: boolean;
  extras: StepExtras;
  onDoneChange: (done: boolean) => void;
  onOpen: (view: View) => void;
}) => {
  const current = extras.current === true && !done;
  const { destination, tag } = extras;
  let action: ReactNode = null;

  if (!done && destination !== undefined) {
    action = (
      <Button
        onClick={() => {
          onOpen(destination.view);
        }}
        size="small"
        variant={current ? "primary" : "ghost"}
        xstyle={current ? styles.start : styles.open}
      >
        {destination.label}
        <ArrowRight aria-hidden size={13} />
      </Button>
    );
  }

  return (
    <li {...stylex.props(styles.step, current && styles.current)}>
      <Checkbox checked={done} label={title} onCheckedChange={onDoneChange} />
      <span {...stylex.props(styles.text)}>
        <span
          {...stylex.props(
            styles.title,
            current && styles.titleCurrent,
            done && styles.titleDone
          )}
        >
          {title}
        </span>
        <span {...stylex.props(styles.hint)}>{hint}</span>
      </span>
      {done || tag === undefined ? null : (
        <Tag tone={tag.urgent ? "red" : "neutral"}>{tag.label}</Tag>
      )}
      {action}
    </li>
  );
};

export const ReviewScreen = () => {
  const { go } = useNavigation();
  const toast = useToast();
  const review = useReview().data;
  const overview = useOverview().data;
  const { projects } = useLookups();
  const today = overview?.today ?? "";
  const checked = new Set(review?.checked);

  const toggle = useStoreAction(
    (store, input: { id: ReviewStepId; done: boolean }) =>
      store.setReviewStep(input.id, input.done)
  );

  const setPhase = useStoreAction(
    async (store, input: { phase: ReviewPhase; done: boolean }) => {
      for (const step of reviewSteps) {
        if (step.phase === input.phase) {
          // oxlint-disable-next-line no-await-in-loop -- Each call returns the whole review, so they must not race.
          await store.setReviewStep(step.id, input.done);
        }
      }
    }
  );

  const finish = useStoreAction((store) => store.finishReview());

  const extras =
    overview === undefined
      ? {}
      : extrasFor(
          overview,
          projects.filter((project) => project.openCount === 0),
          projects[0]?.id
        );

  return (
    <Page>
      <PageHeader
        aside={
          overview === undefined
            ? undefined
            : dayLabelWithComma(overview.review.dueOn)
        }
        description="Get clear, get current, get creative. Each step opens the right list, then brings you back here."
        icon={
          <span {...stylex.props(styles.icon)}>
            <RefreshCcw size={30} />
          </span>
        }
        title="Weekly Review"
      >
        <ProgressBar
          caption={`${checked.size} of ${reviewSteps.length} steps`}
          done={checked.size}
          label="Weekly Review progress"
          tone="violet"
          total={reviewSteps.length}
        />
      </PageHeader>
      {reviewPhases.map((phase) => {
        const steps = reviewSteps.filter((step) => step.phase === phase.id);
        const done = steps.filter((step) => checked.has(step.id)).length;

        return (
          <section
            aria-label={phase.title}
            key={phase.id}
            {...stylex.props(styles.section)}
          >
            <SectionHeading
              count={`${done} of ${steps.length}`}
              menu={[
                {
                  disabled: done === steps.length,
                  label: "Tick all",
                  onSelect: () => {
                    setPhase.mutate({ done: true, phase: phase.id });
                  },
                },
                {
                  disabled: done === 0,
                  label: "Untick all",
                  onSelect: () => {
                    setPhase.mutate({ done: false, phase: phase.id });
                  },
                },
              ]}
              title={phase.title}
            />
            <ul {...stylex.props(styles.list)}>
              {steps.map((step) => (
                <Step
                  done={checked.has(step.id)}
                  extras={extras[step.id] ?? {}}
                  hint={step.hint}
                  key={step.id}
                  onDoneChange={(next) => {
                    toggle.mutate({ done: next, id: step.id });
                  }}
                  onOpen={go}
                  title={step.title}
                />
              ))}
            </ul>
          </section>
        );
      })}
      {/* Not in the design, but the only way to record the review as done. */}
      <span {...stylex.props(styles.finish)}>
        <Button
          disabled={checked.size === 0}
          onClick={() => {
            finish.mutate(null, {
              onSuccess: () => {
                toast({
                  title: `Weekly Review done. Next one ${dayLabel(nextReviewOn(addDays(today, 1)))}.`,
                });
              },
            });
          }}
          size="small"
          variant="outline"
        >
          Finish review
        </Button>
      </span>
    </Page>
  );
};
