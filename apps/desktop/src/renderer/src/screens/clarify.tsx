import {
  addDays,
  clarifyOutcome,
  clarifyProgress,
  datePart,
  reopenStep,
} from "@productivity/gtd";
import type {
  ClarifyAnswers,
  ClarifyOutcome,
  ClarifyStep,
  LocalDate,
  Task,
  WhenAnswer,
} from "@productivity/gtd";
import {
  Button,
  ChoiceCards,
  EmptyState,
  FilterSelect,
  ProgressSteps,
  TextField,
  useToast,
} from "@productivity/ui";
import { color, font, radius, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Check, ChevronRight, Inbox } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { useInbox, useOverview, useStoreAction } from "../data.ts";
import { dayLabel, shortDate, timeLabel } from "../format.ts";
import { useLookups } from "../lookups.ts";
import type { Lookups } from "../lookups.ts";
import { useNavigation } from "../navigation.tsx";
import {
  contextOptions,
  energyOptions,
  minuteOptions,
  none,
  toDate,
  toEnergy,
  toId,
  toMinutes,
} from "../options.ts";
import { Page } from "../page.tsx";

const styles = stylex.create({
  answer: { color: color.textSecondary, fontSize: font.size14 },
  breadcrumb: {
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    fontFamily: font.family,
    fontSize: font.size13,
    gap: 4,
  },
  breadcrumbCurrent: {
    color: color.textPrimary,
    fontWeight: font.weightMedium,
  },
  change: {
    backgroundColor: "transparent",
    borderStyle: "none",
    color: color.textLink,
    cursor: "pointer",
    fontFamily: font.family,
    fontSize: font.size13,
    marginInlineStart: "auto",
    padding: 0,
  },
  current: { display: "flex", flexDirection: "column", gap: space.s4 },
  doneMark: {
    alignItems: "center",
    backgroundColor: color.accent,
    color: color.textOnAccent,
  },
  footer: {
    borderTopColor: color.borderDefault,
    borderTopStyle: "solid",
    borderTopWidth: 1,
    display: "flex",
    gap: space.s2,
    paddingTop: space.s4,
  },
  item: {
    backgroundColor: color.bgSidebar,
    borderRadius: radius.lg,
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    gap: space.s1,
    padding: space.s5,
  },
  itemMeta: { color: color.textTertiary, fontSize: font.size13 },
  itemNotes: { color: color.textSecondary, fontSize: font.size14, margin: 0 },
  itemTitle: {
    color: color.textPrimary,
    fontSize: font.size20,
    fontWeight: font.weightSemibold,
    letterSpacing: "-0.01em",
    margin: 0,
  },
  mark: {
    alignItems: "center",
    borderColor: color.borderStrong,
    borderRadius: radius.full,
    borderStyle: "solid",
    borderWidth: 1,
    color: color.textTertiary,
    display: "inline-flex",
    flexShrink: 0,
    fontSize: font.size12,
    fontWeight: font.weightSemibold,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  markCurrent: { borderColor: color.accent, color: color.accent },
  pending: { opacity: 0.45 },
  question: {
    color: color.textPrimary,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
    margin: 0,
  },
  row: { display: "flex", flexWrap: "wrap", gap: space.s2 },
  spacer: { flexGrow: 1 },
  step: {
    alignItems: "center",
    display: "flex",
    fontFamily: font.family,
    gap: space.s3,
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: space.s4,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
});

const questions: Record<ClarifyStep, string> = {
  actionable: "Is it actionable?",
  disposal: "Where should it go?",
  nextAction: "What's the next physical action?",
  owner: "Who will do it?",
  project: "Is it part of a bigger outcome?",
  twoMinutes: "Will it take less than 2 minutes?",
  when: "When and where can you do it?",
};

const projectLabel = (answers: ClarifyAnswers, lookups: Lookups): string => {
  const { project } = answers;

  if (project?.kind === "existing") {
    return lookups.project(project.projectId)?.name ?? "A project";
  }

  return project?.kind === "new"
    ? `New project: ${project.name}`
    : "No project";
};

const disposalLabel = {
  reference: "Reference",
  someday: "Someday / Maybe",
  trash: "Trash",
} as const;

/** A short version of each answer, shown once a question is done. */
const answerLabels: Record<
  ClarifyStep,
  (answers: ClarifyAnswers, lookups: Lookups) => string
> = {
  actionable: (answers) => (answers.actionable === true ? "Yes" : "No"),
  disposal: (answers) => disposalLabel[answers.disposal ?? "trash"],
  nextAction: (answers) => answers.nextAction ?? "",
  owner: (answers) =>
    answers.owner?.kind === "delegate"
      ? `${answers.owner.person}, follow up ${shortDate(answers.owner.followUpOn)}`
      : "Me",
  project: projectLabel,
  twoMinutes: (answers) =>
    answers.underTwoMinutes === true ? "Yes, done now" : "No",
  when: (answers, lookups) =>
    lookups.context(answers.when?.contextId ?? null)?.name ?? "Any context",
};

const summary = (outcome: ClarifyOutcome): string => {
  switch (outcome.kind) {
    case "trash": {
      return "Deleted";
    }

    case "someday": {
      return "Moved to Someday / Maybe";
    }

    case "reference": {
      return "Kept as reference";
    }

    case "done": {
      return "Done. Nice work.";
    }

    default: {
      return outcome.owner.kind === "delegate"
        ? `Waiting for ${outcome.owner.person}`
        : `Added "${outcome.title}" to Next Actions`;
    }
  }
};

interface StepProps {
  item: Task;
  answers: ClarifyAnswers;
  today: LocalDate;
  lookups: Lookups;
  answer: (next: ClarifyAnswers) => void;
}

/** Choices that answer at once, with no extra fields. */
const QuickChoice = ({
  label,
  choices,
  onPick,
}: {
  label: string;
  choices: { value: string; title: string; description?: string }[];
  onPick: (value: string) => void;
}) => (
  <ChoiceCards
    choices={choices}
    label={label}
    numberShortcuts
    onValueChange={onPick}
    value={null}
  />
);

const NextActionStep = ({ item, answers, answer }: StepProps) => {
  const [text, setText] = useState(answers.nextAction ?? item.title);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        answer({ ...answers, nextAction: text });
      }}
      {...stylex.props(styles.current)}
    >
      <TextField
        autoFocus
        description="Start with a verb: Call, Email, Buy, Draft…"
        label="Next action"
        onValueChange={setText}
        value={text}
      />
      <span>
        <Button disabled={text.trim() === ""} type="submit" variant="primary">
          Continue
        </Button>
      </span>
    </form>
  );
};

const ProjectStep = ({ answers, answer, lookups }: StepProps) => {
  const [choice, setChoice] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(lookups.projects[0]?.id ?? none);
  const [name, setName] = useState("");
  const [outcome, setOutcome] = useState("");

  const pick = (value: string): void => {
    setChoice(value);

    if (value === "none") {
      answer({ ...answers, project: { kind: "none" } });
    }
  };

  const confirm = (): void => {
    if (choice === "existing" && projectId !== none) {
      answer({ ...answers, project: { kind: "existing", projectId } });
    }

    if (choice === "new" && name.trim() !== "") {
      answer({
        ...answers,
        project: { kind: "new", name: name.trim(), outcome: outcome.trim() },
      });
    }
  };

  return (
    <div {...stylex.props(styles.current)}>
      <ChoiceCards
        choices={[
          { title: "No, it stands alone", value: "none" },
          {
            description: "It moves an outcome you already track.",
            detail: (
              <FilterSelect
                label="Project"
                onValueChange={setProjectId}
                options={lookups.projects.map((project) => ({
                  label: project.name,
                  value: project.id,
                }))}
                value={projectId}
              />
            ),
            title: "Yes, add it to a project",
            value: "existing",
          },
          {
            description: "It needs more than one action to finish.",
            detail: (
              <div {...stylex.props(styles.current)}>
                <TextField
                  label="Project name"
                  onValueChange={setName}
                  value={name}
                />
                <TextField
                  label="Done when"
                  onValueChange={setOutcome}
                  placeholder="What does finished look like?"
                  value={outcome}
                />
              </div>
            ),
            title: "Yes, start a new project",
            value: "new",
          },
        ]}
        label={questions.project}
        numberShortcuts
        onValueChange={pick}
        value={choice}
      />
      {choice === "existing" || choice === "new" ? (
        <span>
          <Button onClick={confirm} variant="primary">
            Continue
          </Button>
        </span>
      ) : null}
    </div>
  );
};

const OwnerStep = ({ answers, answer, today }: StepProps) => {
  const [choice, setChoice] = useState<string | null>(null);
  const [person, setPerson] = useState("");
  const [followUpOn, setFollowUpOn] = useState(addDays(today, 3));

  return (
    <div {...stylex.props(styles.current)}>
      <ChoiceCards
        choices={[
          {
            description: "It becomes one of your Next Actions.",
            title: "I will",
            value: "me",
          },
          {
            description: "It goes to Waiting For, with a date to follow up.",
            detail: (
              <div {...stylex.props(styles.row)}>
                <TextField
                  label="Who"
                  onValueChange={setPerson}
                  placeholder="Name"
                  value={person}
                />
                <TextField
                  label="Follow up on"
                  onValueChange={setFollowUpOn}
                  type="date"
                  value={followUpOn}
                />
              </div>
            ),
            title: "Someone else",
            value: "delegate",
          },
        ]}
        label={questions.owner}
        numberShortcuts
        onValueChange={(value) => {
          setChoice(value);

          if (value === "me") {
            answer({ ...answers, owner: { kind: "me" } });
          }
        }}
        value={choice}
      />
      {choice === "delegate" ? (
        <span>
          <Button
            disabled={person.trim() === ""}
            onClick={() => {
              answer({
                ...answers,
                owner: { followUpOn, kind: "delegate", person: person.trim() },
              });
            }}
            variant="primary"
          >
            Continue
          </Button>
        </span>
      ) : null}
    </div>
  );
};

const WhenStep = ({ answers, answer, lookups }: StepProps) => {
  const [contextId, setContextId] = useState(none);
  const [minutes, setMinutes] = useState(none);
  const [energy, setEnergy] = useState(none);
  const [startOn, setStartOn] = useState("");
  const [deadline, setDeadline] = useState("");

  const when: WhenAnswer = {
    contextId: toId(contextId),
    deadline: toDate(deadline),
    energy: toEnergy(energy),
    minutes: toMinutes(minutes),
    startOn: toDate(startOn),
  };

  return (
    <div {...stylex.props(styles.current)}>
      <div {...stylex.props(styles.row)}>
        <FilterSelect
          label="Context"
          onValueChange={setContextId}
          options={contextOptions(lookups)}
          value={contextId}
        />
        <FilterSelect
          label="Time"
          onValueChange={setMinutes}
          options={minuteOptions}
          value={minutes}
        />
        <FilterSelect
          label="Energy"
          onValueChange={setEnergy}
          options={energyOptions}
          value={energy}
        />
      </div>
      <div {...stylex.props(styles.row)}>
        <TextField
          description="Leave empty to start now."
          label="Start on"
          onValueChange={setStartOn}
          type="date"
          value={startOn}
        />
        <TextField
          description="Only if it is a real deadline."
          label="Deadline"
          onValueChange={setDeadline}
          type="date"
          value={deadline}
        />
      </div>
      <span>
        <Button
          onClick={() => {
            answer({ ...answers, when });
          }}
          variant="primary"
        >
          Save action
        </Button>
      </span>
    </div>
  );
};

const CurrentStep = (props: StepProps & { step: ClarifyStep }) => {
  const { step, answers, answer } = props;

  switch (step) {
    case "actionable": {
      return (
        <QuickChoice
          choices={[
            {
              description: "There is something to do about it.",
              title: "Yes",
              value: "yes",
            },
            {
              description: "It is information, an idea or nothing at all.",
              title: "No",
              value: "no",
            },
          ]}
          label={questions.actionable}
          onPick={(value) => {
            answer({ ...answers, actionable: value === "yes" });
          }}
        />
      );
    }

    case "disposal": {
      return (
        <QuickChoice
          choices={[
            {
              description: "You do not need it.",
              title: "Trash",
              value: "trash",
            },
            {
              description: "Maybe later. You will see it in the Weekly Review.",
              title: "Someday / Maybe",
              value: "someday",
            },
            {
              description: "Keep it for information.",
              title: "Reference",
              value: "reference",
            },
          ]}
          label={questions.disposal}
          onPick={(value) => {
            if (
              value === "trash" ||
              value === "someday" ||
              value === "reference"
            ) {
              answer({ ...answers, disposal: value });
            }
          }}
        />
      );
    }

    case "nextAction": {
      return <NextActionStep {...props} />;
    }

    case "twoMinutes": {
      return (
        <QuickChoice
          choices={[
            {
              description: "Do it now, then come back.",
              title: "Yes, I did it now",
              value: "yes",
            },
            {
              description: "Keep going to decide where it lives.",
              title: "No, it takes longer",
              value: "no",
            },
          ]}
          label={questions.twoMinutes}
          onPick={(value) => {
            answer({ ...answers, underTwoMinutes: value === "yes" });
          }}
        />
      );
    }

    case "project": {
      return <ProjectStep {...props} />;
    }

    case "owner": {
      return <OwnerStep {...props} />;
    }

    default: {
      return <WhenStep {...props} />;
    }
  }
};

const StepLine = ({
  mark,
  done,
  current,
  children,
}: {
  mark: ReactNode;
  done: boolean;
  current: boolean;
  children: ReactNode;
}) => (
  <span {...stylex.props(styles.step)}>
    <span
      aria-hidden
      {...stylex.props(
        styles.mark,
        current && styles.markCurrent,
        done && styles.doneMark
      )}
    >
      {mark}
    </span>
    {children}
  </span>
);

/** Clarify the Inbox one item at a time, asking the GTD questions in order. */
export const ClarifyScreen = ({ startWith }: { startWith: string | null }) => {
  const { go } = useNavigation();
  const toast = useToast();
  const lookups = useLookups();
  const today = useOverview().data?.today;
  const inbox = useInbox();
  const [answers, setAnswers] = useState<ClarifyAnswers>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  // Items clarified in this session. Hidden at once, before the inbox refetches.
  const [handled, setHandled] = useState<string[]>([]);
  const [first, setFirst] = useState(startWith);

  const clarify = useStoreAction(
    (store, input: { id: string; outcome: ClarifyOutcome }) =>
      store.clarify(input.id, input.outcome)
  );

  // Oldest first, as GTD processes the inbox top to bottom.
  const queue = (inbox.data ?? [])
    .toReversed()
    .filter(
      (candidate) =>
        !skipped.includes(candidate.id) && !handled.includes(candidate.id)
    );

  const item = queue.find((candidate) => candidate.id === first) ?? queue[0];
  const processed = handled.length;
  const total = processed + queue.length;

  const topbar = (
    <>
      <span {...stylex.props(styles.breadcrumb)}>
        Inbox <ChevronRight aria-hidden size={14} />{" "}
        <span {...stylex.props(styles.breadcrumbCurrent)}>Clarify</span>
      </span>
      <span {...stylex.props(styles.spacer)} />
      <Button
        onClick={() => {
          go({ kind: "inbox" });
        }}
        size="small"
        variant="ghost"
      >
        Exit
      </Button>
    </>
  );

  if (inbox.isPending || today === undefined) {
    return <Page topbar={topbar}>{null}</Page>;
  }

  if (item === undefined) {
    return (
      <Page topbar={topbar}>
        <EmptyState
          icon={<Inbox size={32} />}
          title={skipped.length > 0 ? "Only skipped items left" : "Inbox zero"}
        >
          {skipped.length > 0
            ? "Skipped items stay in the Inbox for next time."
            : "Every item has a place. Well done."}
        </EmptyState>
        <span>
          <Button
            onClick={() => {
              go({ kind: "inbox" });
            }}
            variant="primary"
          >
            Back to Inbox
          </Button>
        </span>
      </Page>
    );
  }

  const progress = clarifyProgress(answers);

  const answer = (next: ClarifyAnswers): void => {
    const outcome = clarifyOutcome(next);

    if (outcome === null) {
      setAnswers(next);

      return;
    }

    clarify.mutate({ id: item.id, outcome });
    toast({ title: summary(outcome) });
    setAnswers({});
    setFirst(null);
    setHandled((ids) => [...ids, item.id]);
  };

  const back = (): void => {
    const last = progress.answered.at(-1);

    if (last !== undefined) {
      setAnswers(reopenStep(answers, last));
    }
  };

  const stepProps = { answer, answers, item, lookups, today };

  return (
    <Page topbar={topbar}>
      <ProgressSteps
        caption={`Item ${processed + 1} of ${total}`}
        done={processed}
        label="Clarifying the Inbox"
        total={total}
      />
      <article aria-label="Item to clarify" {...stylex.props(styles.item)}>
        <h1 {...stylex.props(styles.itemTitle)}>{item.title}</h1>
        {item.notes === "" ? null : (
          <p {...stylex.props(styles.itemNotes)}>{item.notes}</p>
        )}
        <span {...stylex.props(styles.itemMeta)}>
          Captured {dayLabel(datePart(item.capturedAt))} at{" "}
          {timeLabel(item.capturedAt)}
        </span>
      </article>
      <ol aria-label="Questions" {...stylex.props(styles.steps)}>
        {progress.answered.map((step, index) => (
          <li key={step}>
            <StepLine
              current={false}
              done
              mark={<Check size={12} strokeWidth={3} />}
            >
              <span {...stylex.props(styles.answer)}>
                {index + 1}. {questions[step]}{" "}
                <strong>{answerLabels[step](answers, lookups)}</strong>
              </span>
              <button
                onClick={() => {
                  setAnswers(reopenStep(answers, step));
                }}
                type="button"
                {...stylex.props(styles.change)}
              >
                Change
              </button>
            </StepLine>
          </li>
        ))}
        {progress.current === null ? null : (
          <li {...stylex.props(styles.current)}>
            <StepLine current done={false} mark={progress.answered.length + 1}>
              <h2 {...stylex.props(styles.question)}>
                {questions[progress.current]}
              </h2>
            </StepLine>
            <CurrentStep
              key={`${item.id}-${progress.current}`}
              {...stepProps}
              step={progress.current}
            />
          </li>
        )}
        {progress.remaining.map((step, index) => (
          <li key={step} {...stylex.props(styles.pending)}>
            <StepLine
              current={false}
              done={false}
              mark={progress.answered.length + index + 2}
            >
              <span {...stylex.props(styles.answer)}>{questions[step]}</span>
            </StepLine>
          </li>
        ))}
      </ol>
      <div {...stylex.props(styles.footer)}>
        <Button
          disabled={progress.answered.length === 0}
          onClick={back}
          variant="outline"
        >
          Back
        </Button>
        <span {...stylex.props(styles.spacer)} />
        <Button
          onClick={() => {
            setSkipped((ids) => [...ids, item.id]);
            setAnswers({});
            setFirst(null);
          }}
          variant="ghost"
        >
          Skip for now
        </Button>
      </div>
    </Page>
  );
};
