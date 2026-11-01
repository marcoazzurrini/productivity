import type { Change, Proposal } from "@productivity/agent";
import { Button } from "@productivity/ui";
import {
  color,
  font,
  radius,
  shadow,
  space,
  tag,
} from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import {
  CircleCheck,
  FilePenLine,
  ListChecks,
  PencilLine,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import { dayLabel } from "./format.ts";

const styles = stylex.create({
  added: { backgroundColor: tag.greenBg, color: tag.greenFg },
  body: { display: "flex", flexDirection: "column", paddingBlock: space.s1 },
  card: {
    backgroundColor: color.bgCard,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    borderStyle: "solid",
    borderWidth: 1,
    boxShadow: shadow.card,
    fontFamily: font.family,
    overflow: "hidden",
  },
  change: {
    alignItems: "center",
    color: color.textSecondary,
    display: "flex",
    fontFamily: font.family,
    fontSize: font.size13,
    gap: space.s2,
  },
  changeText: { flexGrow: 1, minWidth: 0 },
  check: { color: tag.greenFg, flexShrink: 0 },
  chip: {
    backgroundColor: color.bgHover,
    borderRadius: radius.sm,
    color: color.textSecondary,
    flexShrink: 0,
    fontSize: font.size12,
    fontWeight: font.weightMedium,
    paddingBlock: 2,
    paddingInline: 7,
  },
  diff: {
    borderRadius: radius.md,
    fontSize: font.size13,
    lineHeight: "20px",
    marginInline: space.s3,
    overflow: "hidden",
  },
  diffLine: { paddingInline: space.s2, whiteSpace: "pre-wrap" },
  done: { color: color.textTertiary, fontSize: font.size13 },
  footer: {
    alignItems: "center",
    backgroundColor: color.bgSidebar,
    borderTopColor: color.borderDefault,
    borderTopStyle: "solid",
    borderTopWidth: 1,
    display: "flex",
    gap: space.s2,
    paddingBlock: space.s2,
    paddingInline: space.s3,
  },
  footerText: { color: color.textTertiary, flexGrow: 1, fontSize: font.size13 },
  head: {
    alignItems: "center",
    borderBottomColor: color.borderDefault,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    display: "flex",
    fontSize: font.size13,
    fontWeight: font.weightSemibold,
    gap: space.s2,
    paddingBlock: 10,
    paddingInline: space.s3,
  },
  headIcon: { color: color.accent, flexShrink: 0 },
  headText: { flexGrow: 1 },
  removed: {
    backgroundColor: tag.redBg,
    color: tag.redFg,
    textDecorationLine: "line-through",
  },
  row: {
    alignItems: "flex-start",
    display: "flex",
    gap: 10,
    paddingBlock: 7,
    paddingInline: space.s3,
  },
  rowMain: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: 2,
    minWidth: 0,
  },
  rowTitle: {
    color: color.textPrimary,
    fontSize: font.size14,
    fontWeight: font.weightMedium,
  },
  rowWhy: { color: color.textTertiary, fontSize: font.size12 },
  stale: { color: tag.orangeFg },
  undone: { textDecorationLine: "line-through" },
});

const statusText: Record<Proposal["status"], string> = {
  applied: "Applied",
  discarded: "Discarded",
  pending: "",
  stale: "Out of date: this changed since. Ask again.",
};

const Row = ({
  title,
  detail,
  chip,
}: {
  title: string;
  detail?: string;
  chip?: string;
}) => (
  <div {...stylex.props(styles.row)}>
    <div {...stylex.props(styles.rowMain)}>
      <span {...stylex.props(styles.rowTitle)}>{title}</span>
      {detail === undefined ? null : (
        <span {...stylex.props(styles.rowWhy)}>{detail}</span>
      )}
    </div>
    {chip === undefined ? null : (
      <span {...stylex.props(styles.chip)}>{chip}</span>
    )}
  </div>
);

/** A proposal's icon and the rows that show what it changes. */
interface ProposalView {
  icon: ReactNode;
  body: ReactNode;
}

const proposalBody = (proposal: Proposal): ProposalView => {
  const { action } = proposal;
  const icon = { size: 15, ...stylex.props(styles.headIcon) };

  switch (action.kind) {
    case "edit-journal": {
      return {
        body: (
          <>
            <Row title={`Journal · ${dayLabel(action.day)}`} />
            {action.changes.map((change) => (
              <div key={change.line} {...stylex.props(styles.diff)}>
                {change.removed.map((line, index) => (
                  <div
                    key={`-${index}:${line}`}
                    {...stylex.props(styles.diffLine, styles.removed)}
                  >
                    {line === "" ? " " : line}
                  </div>
                ))}
                {change.added.map((line, index) => (
                  <div
                    key={`+${index}:${line}`}
                    {...stylex.props(styles.diffLine, styles.added)}
                  >
                    {line === "" ? " " : line}
                  </div>
                ))}
              </div>
            ))}
          </>
        ),
        icon: <FilePenLine {...icon} />,
      };
    }

    case "file-inbox": {
      return {
        body: action.items.map((item) => (
          <Row
            chip={item.destination}
            detail={item.reason}
            key={item.taskId}
            title={item.title}
          />
        )),
        icon: <ListChecks {...icon} />,
      };
    }

    case "update-task": {
      return {
        body: <Row detail={action.details.join(" · ")} title={action.title} />,
        icon: <PencilLine {...icon} />,
      };
    }

    default: {
      return {
        body: <Row detail="Delete this task" title={action.title} />,
        icon: <Trash2 {...icon} />,
      };
    }
  }
};

/** A change the agent proposed, with Apply and Discard while it waits. */
export const ProposalCard = ({
  proposal,
  onDecide,
}: {
  proposal: Proposal;
  onDecide: (decision: "apply" | "discard") => void;
}) => {
  const { icon, body } = proposalBody(proposal);

  const many =
    proposal.action.kind === "file-inbox" && proposal.action.items.length > 1;

  return (
    <section aria-label={proposal.summary} {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.head)}>
        {icon}
        <span {...stylex.props(styles.headText)}>{proposal.summary}</span>
      </div>
      <div {...stylex.props(styles.body)}>{body}</div>
      <div {...stylex.props(styles.footer)}>
        {proposal.status === "pending" ? (
          <>
            <span {...stylex.props(styles.footerText)}>
              Nothing changes until you apply it.
            </span>
            <Button
              onClick={() => {
                onDecide("discard");
              }}
              size="small"
              variant="outline"
            >
              Discard
            </Button>
            <Button
              onClick={() => {
                onDecide("apply");
              }}
              size="small"
              variant="primary"
            >
              {many ? "Apply all" : "Apply"}
            </Button>
          </>
        ) : (
          <span
            {...stylex.props(
              styles.footerText,
              proposal.status === "stale" && styles.stale
            )}
          >
            {statusText[proposal.status]}
          </span>
        )}
      </div>
    </section>
  );
};

/** A change already made, such as an Inbox capture, with Undo. */
export const ChangeLine = ({
  change,
  onUndo,
}: {
  change: Change;
  onUndo: () => void;
}) => {
  const undone = change.undoneAt !== null;

  return (
    <div {...stylex.props(styles.change)}>
      <CircleCheck aria-hidden size={15} {...stylex.props(styles.check)} />
      <span {...stylex.props(styles.changeText, undone && styles.undone)}>
        {change.summary}
      </span>
      {undone ? (
        <span {...stylex.props(styles.done)}>Undone</span>
      ) : (
        <Button onClick={onUndo} size="small" variant="ghost">
          Undo
        </Button>
      )}
    </div>
  );
};
