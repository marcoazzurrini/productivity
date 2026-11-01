import type { AgentBlock, AgentMessage, AgentNote } from "@productivity/agent";
import { addDays, toLocalDate } from "@productivity/gtd";
import type { LocalDate } from "@productivity/gtd";
import { Button, ChatText, Dialog, IconButton } from "@productivity/ui";
import {
  color,
  font,
  radius,
  shadow,
  space,
  tag,
} from "@productivity/ui/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Brain,
  Eraser,
  Eye,
  Square,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";

import { ChangeLine, ProposalCard } from "./agent-cards.tsx";
import {
  agentKeys,
  useAgent,
  useAgentContext,
  useAgentHistory,
  useAgentNotes,
  useAgentRunning,
  useAgentStatus,
} from "./agent-context.tsx";
import { viewContextOf } from "./agent-view.ts";
import { errorText, useOverview } from "./data.ts";
import { dayLabel } from "./format.ts";
import { useLookups } from "./lookups.ts";
import { useNavigation } from "./navigation.tsx";

const styles = stylex.create({
  assistant: { display: "flex", flexDirection: "column", gap: space.s3 },
  banner: {
    backgroundColor: tag.orangeBg,
    borderRadius: radius.lg,
    color: tag.orangeFg,
    display: "flex",
    flexDirection: "column",
    fontSize: font.size14,
    gap: space.s2,
    lineHeight: "21px",
    padding: space.s3,
  },
  chip: {
    alignItems: "center",
    backgroundColor: color.bgHover,
    borderRadius: radius.sm,
    color: color.textSecondary,
    display: "inline-flex",
    fontSize: font.size12,
    fontWeight: font.weightMedium,
    gap: 5,
    height: 22,
    paddingInline: 7,
  },
  chipRemove: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderStyle: "none",
    color: color.textTertiary,
    cursor: "pointer",
    display: "inline-flex",
    padding: 0,
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: space.s5,
    marginInline: "auto",
    maxWidth: 640,
    width: "100%",
  },
  composer: {
    backgroundColor: color.bgCard,
    borderColor: color.borderStrong,
    borderRadius: radius.xl,
    borderStyle: "solid",
    borderWidth: 1,
    boxShadow: shadow.card,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginInline: "auto",
    maxWidth: 640,
    paddingBlock: space.s3,
    paddingInline: 14,
    width: "100%",
  },
  composerRow: { alignItems: "center", display: "flex", gap: space.s2 },
  composerWrap: {
    flexShrink: 0,
    paddingBottom: space.s6,
    paddingInline: space.s8,
    paddingTop: space.s2,
  },
  divider: {
    "::after": {
      backgroundColor: color.borderDefault,
      content: '""',
      flexGrow: 1,
      height: 1,
    },
    "::before": {
      backgroundColor: color.borderDefault,
      content: '""',
      flexGrow: 1,
      height: 1,
    },
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    fontSize: font.size12,
    fontWeight: font.weightMedium,
    gap: space.s3,
  },
  empty: {
    color: color.textTertiary,
    fontSize: font.size14,
    lineHeight: "22px",
    margin: 0,
    textAlign: "center",
  },
  error: { color: tag.redFg, fontSize: font.size14, margin: 0 },
  event: {
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    flexDirection: "column",
    fontSize: font.size13,
    gap: space.s1,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    gap: space.s1,
    height: 52,
    paddingInline: space.s5,
  },
  input: {
    "::placeholder": { color: color.textPlaceholder },
    backgroundColor: "transparent",
    borderStyle: "none",
    color: color.textPrimary,
    // Grows with the text, up to its maximum height.
    fieldSizing: "content",
    fontFamily: font.family,
    fontSize: font.size15,
    lineHeight: "24px",
    maxHeight: 200,
    minHeight: 24,
    outline: "none",
    padding: 0,
    resize: "none",
    width: "100%",
  },
  memoryEmpty: { color: color.textTertiary, fontSize: font.size14, margin: 0 },
  memoryHeading: {
    color: color.textTertiary,
    fontSize: font.size12,
    fontWeight: font.weightSemibold,
    letterSpacing: "0.02em",
    margin: 0,
    textTransform: "uppercase",
  },
  memoryList: {
    display: "flex",
    flexDirection: "column",
    gap: space.s1,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  memoryRow: {
    alignItems: "center",
    color: color.textPrimary,
    display: "flex",
    fontSize: font.size14,
    gap: space.s2,
    lineHeight: "21px",
  },
  memoryText: { flexGrow: 1 },
  memoryWrap: { display: "flex", flexDirection: "column", gap: space.s4 },
  older: { alignSelf: "center" },
  pane: {
    backgroundColor: color.bgPage,
    color: color.textPrimary,
    display: "flex",
    flexDirection: "column",
    fontFamily: font.family,
    height: "100%",
    minWidth: 0,
  },
  // Reversed, so the browser keeps the newest message in view as text
  // streams in, unless the user scrolled up to read.
  scroll: {
    display: "flex",
    flexDirection: "column-reverse",
    flexGrow: 1,
    minHeight: 0,
    overflowY: "auto",
    paddingBlock: space.s4,
    paddingInline: space.s8,
  },
  spacer: { flexGrow: 1 },
  thinking: { color: color.textTertiary, fontSize: font.size14 },
  title: {
    fontSize: 18,
    fontWeight: font.weightSemibold,
    letterSpacing: "-0.2px",
    margin: 0,
    marginInlineEnd: "auto",
  },
  tool: {
    alignItems: "center",
    color: color.textTertiary,
    display: "flex",
    fontSize: font.size13,
    gap: 6,
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: color.bgHover,
    borderRadius: radius.xl,
    fontSize: font.size15,
    lineHeight: "24px",
    maxWidth: "85%",
    paddingBlock: space.s2,
    paddingInline: 14,
    whiteSpace: "pre-wrap",
  },
});

/** "Today", "Yesterday" or "Fri Oct 23", for the line between days. */
const dayHeading = (createdAt: string, today: LocalDate | null): string => {
  const day = toLocalDate(new Date(createdAt));

  if (today === null) {
    return dayLabel(day);
  }

  if (day === today) {
    return "Today";
  }

  return day === addDays(today, -1) ? "Yesterday" : dayLabel(day);
};

const Blocks = ({ blocks }: { blocks: AgentBlock[] }) => {
  const agent = useAgent();
  const client = useQueryClient();

  const refresh = (): void => {
    void client.invalidateQueries({ queryKey: agentKeys.history });
  };

  return blocks.map((block, index) => {
    const key = `${index}:${block.kind}`;

    switch (block.kind) {
      case "text": {
        return block.text === "" ? null : (
          <ChatText key={key} text={block.text} />
        );
      }

      case "tool": {
        return (
          <span key={key} {...stylex.props(styles.tool)}>
            <Wrench aria-hidden size={13} />
            {block.label}
          </span>
        );
      }

      case "proposal": {
        return (
          <ProposalCard
            key={block.proposal.id}
            onDecide={(decision) => {
              void agent.decide(block.proposal.id, decision).finally(refresh);
            }}
            proposal={block.proposal}
          />
        );
      }

      case "change": {
        return (
          <ChangeLine
            change={block.change}
            key={block.change.id}
            onUndo={() => {
              void agent.undo(block.change.id).finally(refresh);
            }}
          />
        );
      }

      default: {
        return (
          <p key={key} role="alert" {...stylex.props(styles.error)}>
            {block.text}
          </p>
        );
      }
    }
  });
};

const Message = ({ message }: { message: AgentMessage }) => {
  if (message.role === "user") {
    const [first] = message.blocks;

    return (
      <div {...stylex.props(styles.user)}>
        {first?.kind === "text" ? first.text : ""}
      </div>
    );
  }

  return (
    <div
      {...stylex.props(
        message.role === "event" ? styles.event : styles.assistant
      )}
    >
      <Blocks blocks={message.blocks} />
    </div>
  );
};

/** What the agent remembers, and its open loops, which the user can delete. */
const MemoryDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const agent = useAgent();
  const notes = useAgentNotes(open);
  const client = useQueryClient();
  const all = notes.data ?? [];
  const memory = all.filter((note) => note.kind === "memory");

  const loops = all.filter(
    (note) => note.kind === "loop" && note.doneAt === null
  );

  const list = (title: string, items: AgentNote[], empty: string) => (
    <section aria-label={title} {...stylex.props(styles.memoryWrap)}>
      <h3 {...stylex.props(styles.memoryHeading)}>{title}</h3>
      {items.length === 0 ? (
        <p {...stylex.props(styles.memoryEmpty)}>{empty}</p>
      ) : (
        <ul {...stylex.props(styles.memoryList)}>
          {items.map((note) => (
            <li key={note.id} {...stylex.props(styles.memoryRow)}>
              <span {...stylex.props(styles.memoryText)}>{note.text}</span>
              <IconButton
                icon={<Trash2 size={15} />}
                label={`Forget “${note.text}”`}
                onClick={() => {
                  void agent.deleteNote(note.id).finally(() => {
                    void client.invalidateQueries({
                      queryKey: agentKeys.notes,
                    });
                  });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      open={open}
      showTitle
      title="Memory"
      width={560}
    >
      <div {...stylex.props(styles.memoryWrap)}>
        {list(
          "What it remembers",
          memory,
          "Nothing yet. Say “remember that …” and it will keep it."
        )}
        {list("Open loops", loops, "Nothing unfinished.")}
      </div>
    </Dialog>
  );
};

const ClearDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const agent = useAgent();

  return (
    <Dialog
      footer={
        <>
          <span {...stylex.props(styles.spacer)} />
          <Button onClick={onClose} size="small" variant="outline">
            Cancel
          </Button>
          <Button
            onClick={() => {
              void agent.clear();
              onClose();
            }}
            size="small"
            variant="primary"
          >
            Clear
          </Button>
        </>
      }
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      open={open}
      showTitle
      title="Clear the conversation?"
      width={440}
    >
      <p {...stylex.props(styles.empty)}>
        The messages disappear and the agent starts fresh. What it remembers
        stays.
      </p>
    </Dialog>
  );
};

const StatusBanner = () => {
  const status = useAgentStatus();
  const client = useQueryClient();
  const { data } = status;

  if (data === undefined || data.state === "ready") {
    return null;
  }

  const text =
    data.state === "signed-out"
      ? "Claude Code is not signed in. Run `claude` in Terminal and log in, then check again."
      : data.detail;

  return (
    <output {...stylex.props(styles.banner)}>
      <span>{text}</span>
      <Button
        onClick={() => {
          void client.invalidateQueries({ queryKey: agentKeys.status });
        }}
        size="small"
        variant="outline"
      >
        Check again
      </Button>
    </output>
  );
};

const Composer = () => {
  const agent = useAgent();
  const running = useAgentRunning();
  const { view } = useNavigation();
  const lookups = useLookups();
  const { context, label } = viewContextOf(view, lookups);
  const [text, setText] = useState("");
  // The page whose chip the user removed. A new page shows its chip again.
  const [hiddenView, setHiddenView] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const withView = hiddenView !== label;

  const send = async (): Promise<void> => {
    if (text.trim() === "") {
      return;
    }

    setError(null);

    try {
      await agent.send(text, withView ? context : null);
      setText("");
    } catch (error_) {
      setError(error_ instanceof Error ? errorText(error_) : String(error_));
    }
  };

  return (
    <div {...stylex.props(styles.composerWrap)}>
      <div {...stylex.props(styles.composer)}>
        <textarea
          aria-label="Message the agent"
          // The pane opens to be typed in.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="Ask anything, or say what to change…"
          rows={1}
          value={text}
          {...stylex.props(styles.input)}
        />
        {error === null ? null : (
          <p role="alert" {...stylex.props(styles.error)}>
            {error}
          </p>
        )}
        <div {...stylex.props(styles.composerRow)}>
          {withView ? (
            <span
              {...stylex.props(styles.chip)}
              title="The agent sees what is open"
            >
              <Eye aria-hidden size={12} />
              {label}
              <button
                aria-label={`Don't show ${label} to the agent`}
                onClick={() => {
                  setHiddenView(label);
                }}
                type="button"
                {...stylex.props(styles.chipRemove)}
              >
                <X size={12} />
              </button>
            </span>
          ) : null}
          <span {...stylex.props(styles.spacer)} />
          {running ? (
            <IconButton
              icon={<Square size={13} />}
              label="Stop"
              onClick={() => {
                void agent.stop();
              }}
            />
          ) : (
            <IconButton
              disabled={text.trim() === ""}
              icon={<ArrowUp size={16} />}
              label="Send"
              onClick={() => {
                void send();
              }}
              tone="accent"
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * The agent: one ongoing conversation, beside the page it can see and
 * change. Days are split by a line; there are no separate chats.
 */
export const AgentPane = () => {
  const agent = useAgent();
  const { setOpen } = useAgentContext();
  const history = useAgentHistory();
  const running = useAgentRunning();
  const [older, setOlder] = useState<AgentMessage[]>([]);
  const [noMore, setNoMore] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  // Today by the store's clock, as the rest of the app counts days.
  const today = useOverview().data?.today ?? null;
  const latest = history.data ?? [];
  const seen = new Set(latest.map((message) => message.id));

  const messages = [
    ...older.filter((message) => !seen.has(message.id)),
    ...latest,
  ];

  const last = messages.at(-1);

  const loadOlder = async (): Promise<void> => {
    const [first] = messages;

    if (first === undefined) {
      return;
    }

    const page = await agent.history(first.seq);

    setOlder((current) => [...page, ...current]);
    setNoMore(page.length === 0);
  };

  return (
    <section aria-label="Agent" {...stylex.props(styles.pane)}>
      <div className="drag-region" {...stylex.props(styles.header)}>
        <h2 {...stylex.props(styles.title)}>Agent</h2>
        <IconButton
          icon={<Brain size={16} />}
          label="Memory"
          onClick={() => {
            setMemoryOpen(true);
          }}
        />
        <IconButton
          icon={<Eraser size={16} />}
          label="Clear conversation"
          onClick={() => {
            setClearOpen(true);
          }}
        />
        <IconButton
          icon={<X size={18} />}
          label="Hide the agent"
          onClick={() => {
            setOpen(false);
          }}
        />
      </div>
      <div {...stylex.props(styles.scroll)}>
        <div aria-live="polite" role="log" {...stylex.props(styles.column)}>
          <StatusBanner />
          {messages.length >= 60 && !noMore ? (
            <Button
              onClick={() => {
                void loadOlder();
              }}
              size="small"
              variant="ghost"
              xstyle={styles.older}
            >
              Show earlier messages
            </Button>
          ) : null}
          {history.isSuccess && messages.length === 0 ? (
            <p {...stylex.props(styles.empty)}>
              One ongoing conversation. Ask about your day, or tell it what to
              change: it sees the page in the middle.
            </p>
          ) : null}
          {messages.map((message, index) => {
            const heading = dayHeading(message.createdAt, today);
            const before = messages[index - 1];

            const showDay =
              before === undefined ||
              dayHeading(before.createdAt, today) !== heading;

            return (
              <div key={message.id} {...stylex.props(styles.assistant)}>
                {showDay ? (
                  <div {...stylex.props(styles.divider)}>{heading}</div>
                ) : null}
                <Message message={message} />
              </div>
            );
          })}
          {running && last?.role !== "assistant" ? (
            <span {...stylex.props(styles.thinking)}>Thinking…</span>
          ) : null}
        </div>
      </div>
      <Composer />
      <MemoryDialog
        onClose={() => {
          setMemoryOpen(false);
        }}
        open={memoryOpen}
      />
      <ClearDialog
        onClose={() => {
          setClearOpen(false);
        }}
        open={clearOpen}
      />
    </section>
  );
};
