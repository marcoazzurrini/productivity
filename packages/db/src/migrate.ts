import type { DatabaseSync, SQLOutputValue } from "node:sqlite";

import { migrations } from "./migrations.ts";
import type { Migration } from "./migrations.ts";

const statementBreak = "--> statement-breakpoint";

const isVersion = (value: SQLOutputValue | undefined): value is number =>
  typeof value === "number";

const readVersion = (client: DatabaseSync): number => {
  const version = client.prepare("pragma user_version").get()?.user_version;

  return isVersion(version) ? version : 0;
};

/**
 * Applies the migrations drizzle-kit generated, each in its own transaction.
 * A database records how many it has run in `user_version`, so each runs
 * exactly once. Databases made before Drizzle are at version 1, and the
 * Drizzle baseline creates the same tables, so they skip it and keep their
 * data. Returns true when the database was brand new.
 */
export const migrate = (
  client: DatabaseSync,
  pending: readonly Migration[] = migrations
): boolean => {
  const version = readVersion(client);

  for (const [index, migration] of pending.entries()) {
    if (index < version) {
      continue;
    }

    client.exec("begin");

    try {
      for (const statement of migration.sql.split(statementBreak)) {
        client.exec(statement);
      }

      client.exec(`pragma user_version = ${index + 1}`);
      client.exec("commit");
    } catch (error) {
      client.exec("rollback");
      throw error;
    }
  }

  return version === 0;
};
