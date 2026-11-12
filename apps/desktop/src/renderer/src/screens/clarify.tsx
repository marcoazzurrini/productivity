import {
  addDays,
  clarifyOutcome,
  clarifyProgress,
  datePart,
  reopenStep,
} from "@productivity/gtd";
import type {
  CaptureSource,
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
  SegmentProgress,
  TextField,
  useToast,
} from "@productivity/ui";
import { color, font, radius, space } from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import {
  Check,
  ChevronRight,
  Globe,
  Inbox,
  Mail,
  MessageSquare,
  Mic,
  Plus,
} from "lucide-react";
import { createContext, use, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useInbox, useOverview, useStoreAction } from "../data.ts";
import { DayNav } from "../day-nav.tsx";
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
import { ProjectPie } from "../project-pie.tsx";

const styles = stylex.create({
  // "Back" on the left, "Skip for now" and "Continue" on the right.
  actions: {
    alignItems: "center",
    display: "flex",
    gap: space.s2,
    paddingTop: space.s2,
  },
  answer: {
    color: color.textPrimary,
    fontSize: font.size15,
    fontWeight: font.weightSemibold,
  },
  answerHint: { color: color.textTertiary, fontSize: font.size12 },
  answerLine: { alignItems: "center", display: "flex", gap: space.s2 },
  answeredQuestion: {
    color: color.textSecondary,
    flexGrow: 1,
    fontSize: font.size14,
  },
  breadcrumb: {
    color: color.textTertiary,
    fontFamily: font.family,
    fontSize: font.size13,
  },
  breadcrumbChevron: { color: color.textPlaceholder, display: "flex" },
  breadcrumbCurrent: {
    color: color.textPrimary,
    fontFamily: font.family,
    fontSize: font.size13,
    fontWeight: font.weightSemibold,
  },
  breadcrumbIcon: { color: color.textTertiary, display: "flex" },
  change: {
    backgroundColor: "transparent",
    borderStyle: "none",
    color: color.textLink,
    cursor: "pointer",
    fontFamily: font.family,
    fontSize: font.size12,
    fontWeight: font.weightMedium,
    padding: 0,
  },
  // Where the open question's "Continue" button lands, in the actions row.
  confirmSlot: { display: "flex" },
  // The page already pads its top by 40px; the design asks for 48px here.
  content: {
    display: "flex",
    flexDirection: "column",
    gap: space.s8,
    paddingTop: space.s2,
  },
  current: { display: "flex", flexDirection: "column", gap: space.s3 },
  decision: {
    borderTopColor: color.borderDefault,
    borderTopStyle: "solid",
    borderTopWidth: 1,
    display: "flex",
    flexDirection: "column",
    gap: 22,
    listStyle: "none",
    margin: 0,
    paddingBottom: 0,
    paddingInline: 0,
    paddingTop: space.s6,
  },
  fields: { display: "flex", flexDirection: "column", gap: space.s4 },
  item: {
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    gap: 10,
  },
  itemMeta: {
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    fontSize: font.size12,
    gap: 6,
  },
  itemNotes: {
    color: color.textSecondary,
    fontSize: font.size15,
    lineHeight: "22px",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  itemTitle: {
    color: color.textPrimary,
    fontSize: 28,
    fontWeight: font.weightBold,
    letterSpacing: "-0.6px",
    lineHeight: 1.2,
    margin: 0,
  },
  mark: {
    alignItems: "center",
    borderColor: color.borderStrong,
    borderRadius: radius.full,
    borderStyle: "solid",
    borderWidth: 1.5,
    color: color.textTertiary,
    display: "inline-flex",
    flexShrink: 0,
    fontSize: font.size12,
    fontWeight: font.weightSemibold,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  markCurrent: {
    backgroundColor: color.bgPage,
    borderColor: color.accent,
    borderWidth: 2,
    color: color.accent,
    fontWeight: font.weightBold,
  },
  markDone: {
    backgroundColor: color.accent,
    borderColor: color.accent,
    color: color.textOnAccent,
  },
  position: {
    color: color.textTertiary,
    fontFamily: font.family,
    fontSize: font.size13,
  },
  question: {
    color: color.textPrimary,
    fontSize: 17,
    fontWeight: font.weightSemibold,
    margin: 0,
  },
  row: { display: "flex", flexWrap: "wrap", gap: space.s2 },
  spacer: { flexGrow: 1 },
  step: {
    alignItems: "flex-start",
    display: "flex",
    fontFamily: font.family,
    gap: 14,
  },
  // The text beside a 24px mark sits 2px lower, so first lines align.
  stepBody: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: 3,
    minWidth: 0,
    paddingTop: 2,
  },
  stepBodyCurrent: { gap: space.s3 },
  stepUpcoming: { alignItems: "center" },
  // The top bar's own gap is wider than the design's 8px for this screen.
  topbar: {
    alignItems: "center",
    display: "flex",
    flexGrow: 1,
    gap: space.s2,
    minWidth: 0,
  },
  upcomingHint: { color: color.textPlaceholder, fontSize: font.size12 },
  upcomingQuestion: {
    color: color.textTertiary,
    flexGrow: 1,
    fontSize: font.size14,
  },
});

const questions: Record<ClarifyStep, string> = {
  actionable: "Is it actionable?",
  disposal: "Where should it go?",
  nextAction: "What is the very next physical action?",
  owner: "Who will do it?",
  project: "Is it part of a bigger outcome?",
  twoMinutes: "Can you do it in under 2 minutes?",
  when: "When and where?",
};

/** What a question still to come will ask for, shown at its right end. */
const upcomingHints: Record<ClarifyStep, string> = {
  actionable: "Yes or no",
  disposal: "Trash, Someday / Maybe or Reference",
  nextAction: "Start with a verb",
  owner: "Me, or delegate",
  project: "One action, or a project",
  twoMinutes: "If so, do it now",
  when: "Context, time, energy, date",
};

/** A reminder under an answer of what the other answer would have meant. */
const answerHint = (
  step: ClarifyStep,
  answers: ClarifyAnswers
): string | null =>
  step === "actionable" && answers.actionable === true
    ? "If not, it goes to Trash, Someday / Maybe or Reference"
    : null;

const sourceIcon: Record<CaptureSource, typeof Mail> = {
  chat: MessageSquare,
  mail: Mail,
  manual: Plus,
  voice: Mic,
  web: Globe,
};

const sourceLabel: Record<CaptureSource, string> = {
  chat: "Captured from Chat",
  mail: "Captured from Mail",
  manual: "Captured",
  voice: "Captured as a voice note",
  web: "Captured from the web",
};

/** "today at 7:48 AM", "yesterday at 4:10 PM" or "Mon Oct 19 at 9:00 AM". */
const capturedWhen = (item: Task, today: LocalDate): string => {
  const day = datePart(item.capturedAt);
  const time = timeLabel(item.capturedAt);

  if (day === today) {
    return `today at ${time}`;
  }

  return day === addDays(today, -1)
    ? `yesterday at ${time}`
    : `${dayLabel(day)} at ${time}`;
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
    answers.underTwoMinutes === true ? "Yes, done now" : "No, it takes longer",
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

/**
 * The place in the actions row for the open question's "Continue" button.
 * The button belongs to the question, which knows what it confirms, but
 * the design puts it beside "Skip for now" under the whole list.
 */
const ConfirmSlot = createContext<HTMLElement | null>(null);

const Confirm = ({
  label = "Continue",
  disabled = false,
  onConfirm,
}: {
  label?: string;
  disabled?: boolean;
  onConfirm: () => void;
}) => {
  const slot = use(ConfirmSlot);

  return slot === null
    ? null
    : createPortal(
        <Button
          disabled={disabled}
          onClick={() => {
            onConfirm();
          }}
          variant="primary"
        >
          {label}
        </Button>,
        slot
      );
};

const NextActionStep = ({ item, answers, answer }: StepProps) => {
  const [text, setText] = useState(answers.nextAction ?? item.title);

  const confirm = (): void => {
    if (text.trim() !== "") {
      answer({ ...answers, nextAction: text });
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        confirm();
      }}
      {...stylex.props(styles.fields)}
    >
      <TextField
        autoFocus
        description="Start with a verb: Call, Email, Buy, Draft…"
        label="Next action"
        onValueChange={setText}
        value={text}
      />
      <Confirm disabled={text.trim() === ""} onConfirm={confirm} />
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

  const picked = lookups.project(projectId === none ? null : projectId);

  return (
    <>
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
                hideLabel
                icon={
                  <ProjectPie
                    done={picked?.doneCount ?? 0}
                    total={(picked?.doneCount ?? 0) + (picked?.openCount ?? 0)}
                  />
                }
                label="Project"
                onValueChange={setProjectId}
                options={lookups.projects.map((project) => ({
                  label: project.name,
                  value: project.id,
                }))}
                value={projectId}
              />
            ),
            description: "The project keeps track of what comes next",
            title: "Yes, add it to a project",
            value: "existing",
          },
          {
            description: "You will name the outcome and its first action",
            detail: (
              <div {...stylex.props(styles.fields)}>
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
        <Confirm
          disabled={
            choice === "existing" ? projectId === none : name.trim() === ""
          }
          onConfirm={confirm}
        />
      ) : null}
    </>
  );
};

const OwnerStep = ({ answers, answer, today }: StepProps) => {
  const [choice, setChoice] = useState<string | null>(null);
  const [person, setPerson] = useState("");
  const [followUpOn, setFollowUpOn] = useState(addDays(today, 3));

  return (
    <>
      <ChoiceCards
        choices={[
          {
            description: "It becomes one of your Next Actions",
            title: "Me",
            value: "me",
          },
          {
            description: "It goes to Waiting For, with a date to follow up",
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
            title: "Delegate",
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
        <Confirm
          disabled={person.trim() === ""}
          onConfirm={() => {
            answer({
              ...answers,
              owner: { followUpOn, kind: "delegate", person: person.trim() },
            });
          }}
        />
      ) : null}
    </>
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
    <div {...stylex.props(styles.fields)}>
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
      <Confirm
        label="Save action"
        onConfirm={() => {
          answer({ ...answers, when });
        }}
      />
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
              description: "There is something to do about it",
              title: "Yes",
              value: "yes",
            },
            {
              description: "It goes to Trash, Someday / Maybe or Reference",
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
              description: "You do not need it",
              title: "Trash",
              value: "trash",
            },
            {
              description: "Maybe later. You will see it in the Weekly Review",
              title: "Someday / Maybe",
              value: "someday",
            },
            {
              description: "Keep it for information",
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
              description: "Do it now, then come back",
              title: "Yes, I did it now",
              value: "yes",
            },
            {
              description: "Keep going to decide where it lives",
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

const StepMark = ({
  state,
  children,
}: {
  state: "done" | "current" | "upcoming";
  children: ReactNode;
}) => (
  <span
    aria-hidden
    {...stylex.props(
      styles.mark,
      state === "current" && styles.markCurrent,
      state === "done" && styles.markDone
    )}
  >
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
  const [confirmSlot, setConfirmSlot] = useState<HTMLElement | null>(null);

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
  const position = `Item ${processed + 1} of ${total}`;

  const topbar = (
    <div {...stylex.props(styles.topbar)}>
      <DayNav />
      <span {...stylex.props(styles.breadcrumbIcon)}>
        <Inbox aria-hidden size={15} />
      </span>
      <span {...stylex.props(styles.breadcrumb)}>Inbox</span>
      <span {...stylex.props(styles.breadcrumbChevron)}>
        <ChevronRight aria-hidden size={14} />
      </span>
      <span {...stylex.props(styles.breadcrumbCurrent)}>Clarify</span>
      <span {...stylex.props(styles.spacer)} />
      {item === undefined ? null : (
        <span {...stylex.props(styles.position)}>{position}</span>
      )}
      <Button
        onClick={() => {
          go({ kind: "inbox" });
        }}
        size="small"
        variant="outline"
      >
        Exit
      </Button>
    </div>
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
  const SourceIcon = sourceIcon[item.source];

  return (
    <Page
      progress={
        <SegmentProgress
          done={processed}
          label="Clarifying the Inbox"
          total={total}
          valueText={position}
        />
      }
      topbar={topbar}
    >
      <div {...stylex.props(styles.content)}>
        <article aria-label="Item to clarify" {...stylex.props(styles.item)}>
          <span {...stylex.props(styles.itemMeta)}>
            <SourceIcon aria-hidden size={13} />
            {sourceLabel[item.source]} · {capturedWhen(item, today)}
          </span>
          <h1 {...stylex.props(styles.itemTitle)}>{item.title}</h1>
          {item.notes === "" ? null : (
            <p {...stylex.props(styles.itemNotes)}>{item.notes}</p>
          )}
        </article>
        <ConfirmSlot value={confirmSlot}>
          <ol aria-label="Questions" {...stylex.props(styles.decision)}>
            {progress.answered.map((step) => {
              const hint = answerHint(step, answers);

              return (
                <li key={step} {...stylex.props(styles.step)}>
                  <StepMark state="done">
                    <Check size={14} strokeWidth={2.5} />
                  </StepMark>
                  <span {...stylex.props(styles.stepBody)}>
                    <span {...stylex.props(styles.answerLine)}>
                      <span {...stylex.props(styles.answeredQuestion)}>
                        {questions[step]}
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
                    </span>
                    <strong {...stylex.props(styles.answer)}>
                      {answerLabels[step](answers, lookups)}
                    </strong>
                    {hint === null ? null : (
                      <span {...stylex.props(styles.answerHint)}>{hint}</span>
                    )}
                  </span>
                </li>
              );
            })}
            {progress.current === null ? null : (
              <li {...stylex.props(styles.step)}>
                <StepMark state="current">
                  {progress.answered.length + 1}
                </StepMark>
                <div {...stylex.props(styles.stepBody, styles.stepBodyCurrent)}>
                  <h2 {...stylex.props(styles.question)}>
                    {questions[progress.current]}
                  </h2>
                  <CurrentStep
                    key={`${item.id}-${progress.current}`}
                    {...stepProps}
                    step={progress.current}
                  />
                </div>
              </li>
            )}
            {progress.remaining.map((step, index) => (
              <li
                key={step}
                {...stylex.props(styles.step, styles.stepUpcoming)}
              >
                <StepMark state="upcoming">
                  {progress.answered.length + index + 2}
                </StepMark>
                <span {...stylex.props(styles.upcomingQuestion)}>
                  {questions[step]}
                </span>
                <span {...stylex.props(styles.upcomingHint)}>
                  {upcomingHints[step]}
                </span>
              </li>
            ))}
          </ol>
        </ConfirmSlot>
        <div {...stylex.props(styles.actions)}>
          <Button
            disabled={progress.answered.length === 0}
            onClick={back}
            variant="ghost"
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
          <span ref={setConfirmSlot} {...stylex.props(styles.confirmSlot)} />
        </div>
      </div>
    </Page>
  );
};
