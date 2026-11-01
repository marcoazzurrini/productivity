import type { AgentEvent, AgentMessage } from "@productivity/agent";
import type { LocalDate } from "@productivity/gtd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { createRemoteAgent } from "../../shared/agent.ts";
import type { AgentBridge, RemoteAgent } from "../../shared/agent.ts";

export const agentKeys = {
  history: ["agent", "history"],
  notes: ["agent", "notes"],
  running: ["agent", "running"],
  status: ["agent", "status"],
} as const;

interface AgentContextValue {
  agent: RemoteAgent;
  /** Whether the agent pane is open, beside a one-day calendar. */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Bumped when the agent changes a day's journal page, to reload it. */
  journalVersion: (day: LocalDate) => number;
  /** Bumped when the conversation is cleared, to start the pane afresh. */
  generation: number;
}

const AgentContext = createContext<AgentContextValue | null>(null);

/** Adds or replaces a message, keeping the conversation in order. */
const upsert = (
  messages: AgentMessage[] | undefined,
  message: AgentMessage
): AgentMessage[] | undefined => {
  if (messages === undefined) {
    return messages;
  }

  const others = messages.filter((each) => each.id !== message.id);

  return [...others, message].toSorted((left, right) => left.seq - right.seq);
};

/** Adds streamed text to the last text block of a message. */
const appendDelta = (
  messages: AgentMessage[] | undefined,
  messageId: string,
  text: string
): AgentMessage[] | undefined =>
  messages?.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    const blocks = [...message.blocks];
    const last = blocks.at(-1);

    if (last?.kind === "text") {
      blocks[blocks.length - 1] = { ...last, text: last.text + text };
    } else {
      blocks.push({ kind: "text", text });
    }

    return { ...message, blocks };
  });

const applyEvent = (
  client: QueryClient,
  event: AgentEvent,
  bumpJournal: (days: LocalDate[]) => void,
  cleared: () => void
): void => {
  switch (event.type) {
    case "message": {
      client.setQueryData<AgentMessage[]>(agentKeys.history, (messages) =>
        upsert(messages, event.message)
      );
      break;
    }

    case "delta": {
      client.setQueryData<AgentMessage[]>(agentKeys.history, (messages) =>
        appendDelta(messages, event.messageId, event.text)
      );
      break;
    }

    case "running": {
      client.setQueryData(agentKeys.running, event.running);
      break;
    }

    case "data-changed": {
      bumpJournal(event.journalDays);
      void client.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== "agent",
      });
      break;
    }

    case "cleared": {
      cleared();
      void client.invalidateQueries({ queryKey: agentKeys.history });
      break;
    }

    default: {
      // Proposals, changes or notes moved on.
      void client.invalidateQueries({ queryKey: agentKeys.history });
      void client.invalidateQueries({ queryKey: agentKeys.notes });
    }
  }
};

/**
 * Provides the agent, keeps its conversation current from the main
 * process's events, and holds whether the pane is open. ⌘L opens and
 * closes it. Tests pass a bridge to an agent with a scripted runtime.
 */
export const AgentProvider = ({
  bridge,
  children,
}: {
  bridge: AgentBridge;
  children: ReactNode;
}) => {
  const client = useQueryClient();
  const agent = useMemo(() => createRemoteAgent(bridge.call), [bridge]);
  const [open, setOpen] = useState(false);
  const [generation, setGeneration] = useState(0);

  const [versions, setVersions] = useState<ReadonlyMap<LocalDate, number>>(
    () => new Map()
  );

  const bumpJournal = useCallback((days: LocalDate[]) => {
    if (days.length === 0) {
      return;
    }

    setVersions((current) => {
      const next = new Map(current);

      for (const day of days) {
        next.set(day, (next.get(day) ?? 0) + 1);
      }

      return next;
    });
  }, []);

  useEffect(
    () =>
      bridge.onEvent((event) => {
        applyEvent(client, event, bumpJournal, () => {
          setGeneration((current) => current + 1);
        });
      }),
    [bridge, bumpJournal, client]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey && !event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const value = useMemo(
    () => ({
      agent,
      generation,
      journalVersion: (day: LocalDate) => versions.get(day) ?? 0,
      open,
      setOpen,
    }),
    [agent, generation, open, versions]
  );

  return <AgentContext value={value}>{children}</AgentContext>;
};

export const useAgentContext = (): AgentContextValue => {
  const value = use(AgentContext);

  if (value === null) {
    throw new Error("useAgentContext needs an AgentProvider above it.");
  }

  return value;
};

export const useAgent = (): RemoteAgent => useAgentContext().agent;

/** The conversation's newest messages, kept current by the agent's events. */
export const useAgentHistory = () => {
  const agent = useAgent();

  return useQuery({
    queryFn: () => agent.history(),
    queryKey: agentKeys.history,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useAgentRunning = (): boolean => {
  const agent = useAgent();

  return (
    useQuery({
      queryFn: () => agent.isRunning(),
      queryKey: agentKeys.running,
      staleTime: Number.POSITIVE_INFINITY,
    }).data ?? false
  );
};

/** Whether Claude Code is installed and signed in. Checked when asked. */
export const useAgentStatus = () => {
  const agent = useAgent();

  return useQuery({
    queryFn: () => agent.status(),
    queryKey: agentKeys.status,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAgentNotes = (enabled: boolean) => {
  const agent = useAgent();

  return useQuery({
    enabled,
    queryFn: () => agent.notes(),
    queryKey: agentKeys.notes,
  });
};
