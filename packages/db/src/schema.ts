/**
 * Schema changes, applied in order. A database records how many it has run
 * in `user_version`, so each migration runs exactly once. Never edit a
 * shipped migration: append a new one.
 */
export const migrations: readonly string[] = [
  `
  create table contexts (
    id text primary key,
    name text not null,
    color text not null,
    position integer not null
  );

  create table areas (
    id text primary key,
    name text not null,
    position integer not null
  );

  create table projects (
    id text primary key,
    name text not null,
    area_id text references areas (id) on delete set null,
    outcome text not null default '',
    deadline text,
    status text not null default 'active',
    created_at text not null
  );

  create table tasks (
    id text primary key,
    title text not null,
    notes text not null default '',
    list text not null,
    source text not null default 'manual',
    captured_at text not null,
    project_id text references projects (id) on delete set null,
    context_id text references contexts (id) on delete set null,
    minutes integer,
    energy text,
    start_on text,
    deadline text,
    starred integer not null default 0,
    waiting_on text,
    follow_up_on text,
    block_start text,
    block_end text,
    completed_at text
  );

  create index tasks_by_list on tasks (list, completed_at);
  create index tasks_by_project on tasks (project_id);
  create index tasks_by_block on tasks (block_start);

  create table events (
    id text primary key,
    title text not null,
    kind text not null,
    start text not null,
    end_at text not null,
    all_day integer not null default 0
  );

  create index events_by_start on events (start);

  create table review_steps (
    step_id text primary key
  );

  create table settings (
    key text primary key,
    value text not null
  );
  `,
];
