import {
  nextReviewOn,
  addDays,
  reviewPhases,
  reviewSteps,
} from "@productivity/gtd";
import type { ReviewStepId } from "@productivity/gtd";
import {
  Button,
  Checkbox,
  PageHeader,
  ProgressSteps,
  SectionHeading,
  useToast,
} from "@productivity/ui";
import { color, font, radius, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { RefreshCcw } from "lucide-react";

import { useOverview, useReview, useStoreAction } from "../data.ts";
import { dayLabel } from "../format.ts";
import type { View } from "../navigation.tsx";
import { useNavigation } from "../navigation.tsx";
import { Page, Section } from "../page.tsx";

const styles = stylex.create({
  hint: { color: color.textTertiary, fontSize: font.size13 },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  step: {
    alignItems: "center",
    borderRadius: radius.md,
    display: "flex",
    fontFamily: font.family,
    gap: space.s3,
    minHeight: 52,
    paddingInline: space.s2,
  },
  stepDone: { opacity: 0.6 },
  text: { display: "flex", flexDirection: "column", flexGrow: 1, gap: 2 },
  title: {
    color: color.textPrimary,
    fontSize: font.size14,
    fontWeight: font.weightMedium,
  },
});

/** Where each step's work happens, so the review can jump there. */
const destinations: Partial<
  Record<ReviewStepId, { label: string; view: View }>
> = {
  inbox: { label: "Start clarifying", view: { kind: "clarify", taskId: null } },
  "next-actions": { label: "Open", view: { contextId: null, kind: "next" } },
  someday: { label: "Open", view: { kind: "someday" } },
  "upcoming-calendar": { label: "Open", view: { kind: "upcoming" } },
  "waiting-for": { label: "Open", view: { kind: "waiting" } },
};

export const ReviewScreen = () => {
  const { go } = useNavigation();
  const toast = useToast();
  const review = useReview().data;
  const today = useOverview().data?.today ?? "";
  const checked = new Set(review?.checked);

  const toggle = useStoreAction(
    (store, input: { id: ReviewStepId; done: boolean }) =>
      store.setReviewStep(input.id, input.done)
  );

  const finish = useStoreAction((store) => store.finishReview());

  return (
    <Page>
      <PageHeader
        aside={
          review?.lastReviewedOn
            ? `Last done ${dayLabel(review.lastReviewedOn)}`
            : undefined
        }
        description="Once a week, get clear, get current and get creative. It keeps the whole system trustworthy."
        icon={<RefreshCcw color="#A46EE0" size={30} />}
        title="Weekly Review"
      />
      <ProgressSteps
        caption={`${checked.size} of ${reviewSteps.length}`}
        done={checked.size}
        label="Weekly Review progress"
        total={reviewSteps.length}
      />
      {reviewPhases.map((phase) => {
        const steps = reviewSteps.filter((step) => step.phase === phase.id);

        return (
          <Section key={phase.id} label={phase.title}>
            <SectionHeading count={steps.length} title={phase.title} />
            <ul {...stylex.props(styles.list)}>
              {steps.map((step) => {
                const done = checked.has(step.id);
                const destination = destinations[step.id];

                return (
                  <li
                    key={step.id}
                    {...stylex.props(styles.step, done && styles.stepDone)}
                  >
                    <Checkbox
                      checked={done}
                      label={step.title}
                      onCheckedChange={(next) => {
                        toggle.mutate({ done: next, id: step.id });
                      }}
                    />
                    <span {...stylex.props(styles.text)}>
                      <span {...stylex.props(styles.title)}>{step.title}</span>
                      <span {...stylex.props(styles.hint)}>{step.hint}</span>
                    </span>
                    {destination === undefined || done ? null : (
                      <Button
                        onClick={() => {
                          go(destination.view);
                        }}
                        size="small"
                        variant={step.id === "inbox" ? "primary" : "outline"}
                      >
                        {destination.label}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}
      <span>
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
          variant="primary"
        >
          Finish review
        </Button>
      </span>
    </Page>
  );
};
