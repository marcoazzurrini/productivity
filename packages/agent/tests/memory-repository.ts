import type {
  AgentNote,
  AgentRepository,
  AgentStateKey,
  Change,
  Proposal,
  StoredMessage,
} from "../src/index.ts";

type Kept = StoredMessage & { hidden: boolean };

/** A message as the repository hands it out, without its hidden flag. */
const strip = ({ hidden: _hidden, ...message }: Kept): StoredMessage =>
  structuredClone(message);

/** The repository contract in memory. `@productivity/db` has the real one. */
export const memoryRepository = (): AgentRepository => {
  const messages: Kept[] = [];
  const state = new Map<AgentStateKey, string>();
  const proposals = new Map<string, Proposal>();
  const changes = new Map<string, Change>();
  const notes = new Map<string, AgentNote>();

  const visible = () => messages.filter((message) => !message.hidden);

  return {
    appendMessage: (input) => {
      const message = {
        ...structuredClone(input),
        hidden: false,
        id: crypto.randomUUID(),
        seq: messages.length + 1,
      };

      messages.push(message);

      return strip(message);
    },
    deleteNote: (id) => {
      notes.delete(id);
    },
    getChange: (id) => structuredClone(changes.get(id) ?? null),
    getProposal: (id) => structuredClone(proposals.get(id) ?? null),
    getState: (key) => state.get(key) ?? null,
    hideMessages: () => {
      for (const message of messages) {
        message.hidden = true;
      }
    },
    listMessages: ({ beforeSeq, limit }) =>
      visible()
        .filter((message) => beforeSeq === undefined || message.seq < beforeSeq)
        .slice(-limit)
        .map(strip),
    listNotes: () => [...notes.values()].map((note) => structuredClone(note)),
    messagesAfter: (seq) =>
      visible()
        .filter((message) => message.seq > seq)
        .map(strip),
    saveChange: (change) => {
      changes.set(change.id, structuredClone(change));
    },
    saveNote: (note) => {
      notes.set(note.id, structuredClone(note));
    },
    saveProposal: (proposal) => {
      proposals.set(proposal.id, structuredClone(proposal));
    },
    setState: (key, value) => {
      if (value === null) {
        state.delete(key);
      } else {
        state.set(key, value);
      }
    },
    updateMessage: (id, blocks) => {
      const message = messages.find((each) => each.id === id);

      if (message !== undefined) {
        message.blocks = structuredClone(blocks);
      }
    },
  };
};
