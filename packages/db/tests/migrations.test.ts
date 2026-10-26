import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { SQLOutputValue } from "node:sqlite";

import { openStore } from "../src/index.ts";
import { migrate } from "../src/migrate.ts";
import { migrations } from "../src/migrations.ts";
import { fixedNow } from "./helpers.ts";
import { legacySchema } from "./legacy-schema.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

const tempFile = (): string => {
  const directory = mkdtempSync(path.join(tmpdir(), "productivity-"));

  directories.push(directory);

  return path.join(directory, "gtd.sqlite");
};

type Rows = Record<string, SQLOutputValue>[];

interface TableSchema {
  table: string;
  columns: Rows;
  foreignKeys: Rows;
  indexes: Rows;
}

/** Everything about a database's shape that queries depend on, in a stable order. */
const describeSchema = (client: DatabaseSync): TableSchema[] => {
  const tables = client
    .prepare(
      "select name from sqlite_master where type = 'table' order by name"
    )
    .all()
    .map((row) => String(row.name));

  return tables.map((table) => ({
    columns: client
      .prepare(
        `select name, type, "notnull", pk from pragma_table_info('${table}') order by name`
      )
      .all(),
    foreignKeys: client
      .prepare(
        `select "from", "table", "to", on_delete from pragma_foreign_key_list('${table}') order by "from"`
      )
      .all(),
    indexes: client
      .prepare(
        `select name from pragma_index_list('${table}') where origin = 'c' order by name`
      )
      .all(),
    table,
  }));
};

describe("migrations", () => {
  test("src/migrations.ts matches the SQL in migrations/", () => {
    const folder = path.join(import.meta.dir, "..", "migrations");

    const onDisk = readdirSync(folder)
      .toSorted()
      .map((name) => ({
        name,
        sql: readFileSync(path.join(folder, name, "migration.sql"), "utf-8"),
      }));

    expect(migrations).toEqual(onDisk);
  });

  test("the baseline migration matches the schema made before Drizzle", () => {
    const legacy = new DatabaseSync(":memory:");
    const current = new DatabaseSync(":memory:");

    legacy.exec(legacySchema);
    migrate(current, migrations.slice(0, 1));

    expect(describeSchema(current)).toEqual(describeSchema(legacy));

    legacy.close();
    current.close();
  });

  test("a database made before Drizzle keeps its data", () => {
    const file = tempFile();
    const legacy = new DatabaseSync(file);

    legacy.exec(legacySchema);
    legacy.exec("pragma user_version = 1");
    legacy.exec(
      "insert into contexts (id, name, color, position) values ('calls', '@Calls', 'green', 0)"
    );
    legacy.exec(
      `insert into tasks (id, title, list, captured_at, context_id, starred)
       values ('old', 'Call the bank', 'next', '2026-10-20T09:00', 'calls', 1)`
    );
    legacy.close();

    const store = openStore({ clock: () => fixedNow, path: file });

    expect(store.listContexts()).toEqual([
      { color: "green", id: "calls", name: "@Calls" },
    ]);
    expect(store.listNextActions()).toMatchObject([
      { contextId: "calls", id: "old", starred: true, title: "Call the bank" },
    ]);

    store.capture({ title: "Captured after the upgrade" });
    store.journal.write("2026-10-23", "Upgraded today.");

    expect(store.listInbox()).toHaveLength(1);
    expect(store.journal.read("2026-10-23").markdown).toBe("Upgraded today.");

    store.close();
  });

  test("events move onto the local calendar, timed ones in UTC", () => {
    const file = tempFile();
    const legacy = new DatabaseSync(file);

    migrate(legacy, migrations.slice(0, 2));
    legacy.exec(
      `insert into events (id, title, kind, start, end_at, all_day) values
       ('standup', 'Standup', 'meeting', '2026-10-22T09:00', '2026-10-22T09:30', 0),
       ('offsite', 'Offsite', 'focus', '2026-10-22T00:00', '2026-10-23T23:59', 1)`
    );
    legacy.close();

    // SQLite converts with the system time zone, like the app's JavaScript.
    // Bun's tests run JavaScript in UTC, so ask SQLite for the expected value.
    const probe = new DatabaseSync(":memory:");

    const utc = (local: string): string =>
      String(
        probe
          .prepare("select strftime('%Y-%m-%dT%H:%M:%fZ', ?, 'utc') as utc")
          .get(local)?.utc
      );

    const store = openStore({ clock: () => fixedNow, path: file });

    const window = {
      fromDate: "2026-10-19",
      fromInstant: "2026-10-18T00:00:00.000Z",
      toDate: "2026-10-26",
      toInstant: "2026-10-27T00:00:00.000Z",
    };

    expect(store.calendarRepository.listCalendars()).toMatchObject([
      { id: "local", source: "local", writable: true },
    ]);
    expect(store.calendarRepository.eventsIn(window)).toEqual([
      {
        allDay: true,
        calendarId: "local",
        editable: true,
        end: "2026-10-24",
        etag: null,
        id: "offsite",
        pending: null,
        recurring: false,
        remoteId: null,
        start: "2026-10-22",
        title: "Offsite",
      },
      {
        allDay: false,
        calendarId: "local",
        editable: true,
        end: utc("2026-10-22T09:30"),
        etag: null,
        id: "standup",
        pending: null,
        recurring: false,
        remoteId: null,
        start: utc("2026-10-22T09:00"),
        title: "Standup",
      },
    ]);

    probe.close();
    store.close();
  });
});
