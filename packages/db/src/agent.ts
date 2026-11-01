import type { AgentRepository, StoredMessage } from "@productivity/agent";
import { and, asc, desc, eq, gt, lt, max } from "drizzle-orm";
import type { NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";

import {
  agentChanges,
  agentMessages,
  agentNotes,
  agentProposals,
  agentState,
} from "./schema.ts";

const toMessage = (row: typeof agentMessages.$inferSelect): StoredMessage => ({
  blocks: row.blocks,
  createdAt: row.createdAt,
  id: row.id,
  role: row.role,
  seq: row.seq,
});

const visible = eq(agentMessages.hidden, false);

/** The agent's storage, in the app's one SQLite database. */
export const createAgentRepository = (
  db: NodeSQLiteDatabase
): AgentRepository => ({
  appendMessage: (input) =>
    db.transaction((tx) => {
      const last =
        tx
          .select({ seq: max(agentMessages.seq) })
          .from(agentMessages)
          .get()?.seq ?? 0;

      const message: StoredMessage = {
        ...input,
        id: crypto.randomUUID(),
        seq: last + 1,
      };

      tx.insert(agentMessages).values(message).run();

      return message;
    }),

  deleteNote: (id) => {
    db.delete(agentNotes).where(eq(agentNotes.id, id)).run();
  },

  getChange: (id) =>
    db.select().from(agentChanges).where(eq(agentChanges.id, id)).get()
      ?.change ?? null,

  getProposal: (id) =>
    db.select().from(agentProposals).where(eq(agentProposals.id, id)).get()
      ?.proposal ?? null,

  getState: (key) =>
    db.select().from(agentState).where(eq(agentState.key, key)).get()?.value ??
    null,

  hideMessages: () => {
    db.update(agentMessages).set({ hidden: true }).run();
  },

  listMessages: ({ beforeSeq, limit }) =>
    db
      .select()
      .from(agentMessages)
      .where(
        beforeSeq === undefined
          ? visible
          : and(visible, lt(agentMessages.seq, beforeSeq))
      )
      .orderBy(desc(agentMessages.seq))
      .limit(limit)
      .all()
      .map(toMessage)
      .toReversed(),

  listNotes: () =>
    db.select().from(agentNotes).orderBy(asc(agentNotes.createdAt)).all(),

  messagesAfter: (seq) =>
    db
      .select()
      .from(agentMessages)
      .where(and(visible, gt(agentMessages.seq, seq)))
      .orderBy(asc(agentMessages.seq))
      .all()
      .map(toMessage),

  saveChange: (change) => {
    db.insert(agentChanges)
      .values({ change, id: change.id })
      .onConflictDoUpdate({ set: { change }, target: agentChanges.id })
      .run();
  },

  saveNote: (note) => {
    db.insert(agentNotes)
      .values(note)
      .onConflictDoUpdate({
        set: { doneAt: note.doneAt, kind: note.kind, text: note.text },
        target: agentNotes.id,
      })
      .run();
  },

  saveProposal: (proposal) => {
    db.insert(agentProposals)
      .values({ id: proposal.id, proposal })
      .onConflictDoUpdate({ set: { proposal }, target: agentProposals.id })
      .run();
  },

  setState: (key, value) => {
    if (value === null) {
      db.delete(agentState).where(eq(agentState.key, key)).run();

      return;
    }

    db.insert(agentState)
      .values({ key, value })
      .onConflictDoUpdate({ set: { value }, target: agentState.key })
      .run();
  },

  updateMessage: (id, blocks) => {
    db.update(agentMessages)
      .set({ blocks })
      .where(eq(agentMessages.id, id))
      .run();
  },
});
