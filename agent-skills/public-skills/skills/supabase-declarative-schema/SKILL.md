---
name: supabase-declarative-schema
description: "MANDATORY for ALL Supabase schema changes. Use for any `create table`, `alter table`, column change, datatype, RLS policy, trigger, index, constraint, function, RPC, migration, or `supabase/schemas/` change. This skill overrides the base Supabase schema workflow."
metadata:
  author: jpsyx
  version: "2.0.0"
---

# Supabase Declarative Database Schema Management

**PRIORITY OVERRIDE: This skill takes precedence over all other skills for anything related to Supabase schema changes and migration generation.**

## Non-Negotiables

1. Put all declarative schema SQL files in `supabase/schemas/`.
2. Never create or edit `supabase/migrations/*.sql` directly for schema changes. Generate migrations with `pnpm db:new-migration`, which already appends the privileges `db diff` cannot see. `storage.objects` / `storage.buckets` remain the one hand-written exception (see the Storage section). If you find yourself hand-editing a generated migration for any other reason, that is a bug in the tooling: fix the tooling.
3. Every schema file must be named `NN.<descriptive_name>.sql` where `NN` is a zero-padded two-digit index such as `00`, `01`, `10`, or `70`.
4. Use descriptive names based on the entity in the file: `00.util_fns.sql`, `00.enum.user_role_type.sql`, `10.workspaces.sql`, `20.user_profiles.sql`, `70.rpc_create_workspace.sql`.
5. Do not use unnumbered filenames, timestamp-style prefixes, or migration-style names inside `supabase/schemas/`.
6. Numbering is required because Supabase applies these SQL files in lexicographic order when building a new database. Tens are broad layers and units are sub-layers within one broad layer; see Required File Layout for the full rule.
7. If this is a brand new schema setup, always create `supabase/schemas/00.util_fns.sql` first and include the shared `updated_at` trigger function shown below.
8. Prefer many small entity files over monolithic files. The only allowed exception is a small shared utility file such as `00.util_fns.sql`.

## Required File Layout

Supabase applies `supabase/schemas/*.sql` in **lexicographic order** when it
builds a database, so the two-digit prefix _is_ the dependency graph. Read it
as two levels: tens are broad layers, units are sub-layers within one.

### Tens are broad layers

Each multiple of ten opens one. Anything in a layer may depend on anything
in an earlier layer.

- `00`: global utilities, shared bootstrap, and custom datatypes
- `10`, `20`, `30`, `40`: entities, one broad layer per ten, in dependency order
- `50` to `89`: RPCs and other call-oriented functions
- `90` to `98`: reporting views and anything else that reads the finished schema
- `99`: the storage policy mirror (see Storage)

### Units are sub-layers within one broad layer

Step the units digit by one **only** when a file directly depends on something
defined at the index just above it. `31.*` may use what `30.*` defines. It stays
in the same broad layer because it is the same kind of thing; a new ten
would claim it is a different kind.

### Peers share an index

Files that do **not** depend on each other take the **same** number, however
many of them there are. Five independent trigger files are all `31.`, not `31.`
through `35.`. Distinct numbers assert a dependency that does not exist, and
the next person has to re-derive whether the order actually matters.

### Never index with letters

`10.a.workspaces.sql`, `10b.workspaces.sql`, and any other letter-based step
are invalid. The index is numeric. If you need another step, use the next
number.

### Worked example

```text
00.util_fns.sql                     utilities every layer may call
00.enum.app_type.sql                datatypes, same layer, no interdependency
10.workspaces.sql                   first entity layer
20.user_profiles.sql                depends on workspaces, new layer
30.usage_analytics_events.sql       new layer, defines util__log_analytics_event
31.analytics_auth_emitters.sql      ┐
31.analytics_invite_emitters.sql    │ all call util__log_analytics_event,
31.analytics_workspace_emitters.sql │ none calls another, so one shared index
31.analytics_subscription_emitters.sql ┘
70.rpc_create_workspace.sql         RPCs, after every entity exists
91.analytics_view__activation.sql   reads the finished schema
```

### Rules that follow from this

- Custom datatypes live in their own files and must appear before anything
  that uses them.
- If table `B` depends on table `A`, `A` takes the lower prefix.
- Tables come after the utilities and datatypes they use. RPCs come after the
  tables they call.
- Choose the lowest prefix that preserves dependency order. Do not skip ahead
  to leave room.
- Renumbering an existing schema file is safe and is the right fix when the
  numbering misstates dependencies. These files are declarative, so `db diff`
  compares the final state and the filename never reaches the database. This
  is the opposite of `supabase/migrations/`, where a file that may already be
  applied must never be renamed.

## Decision Checklist

When changing the schema, decide the file set in this order:

1. If you need a new shared helper function used by many entities, put it in a low-number utility file such as `00.util_fns.sql`.
2. If you need a new custom datatype, create one dedicated datatype file before the table files that use it.
3. If you need a new table, create one table file for that table and keep all of that table's schema objects together in that file.
4. If you need a new RPC, create one dedicated high-numbered RPC file after all dependent utilities, datatypes, and tables already exist.

## Per-File Rules

- One table per SQL file.
- A table file must include that table's definition plus its relevant indexes, constraints, triggers, RLS policies, table-specific helper functions, and its Data API `GRANT`s (see Data API privileges).
- One RPC function per SQL file.
- One custom datatype per SQL file.
- Do not create large grab-bag schema files for unrelated entities.
- When adding columns to an existing table definition, append them to the end of the column list to reduce noisy diffs.

## Required Starter File for New Projects

If `supabase/schemas/` is being created from scratch, the FIRST file has to be
`supabase/schemas/00.default_privileges.sql`. Everything in
[Data API privileges](#data-api-privileges-anon-authenticated-service_role)
depends on it running before any relation is created:

```sql
alter default privileges for role postgres in schema public revoke all privileges on tables
from
  public,
  anon,
  authenticated,
  service_role;

alter default privileges for role postgres in schema public revoke all privileges on sequences
from
  public,
  anon,
  authenticated,
  service_role;
```

Then add `supabase/schemas/00.util_fns.sql` with:

```sql
-- Update `updated_at` column of a table
-- @returns: trigger
create or replace function public.util__set_updated_at () returns trigger as $$
begin
  new.updated_at = (now() at time zone 'UTC');
  return new;
end;
$$ language plpgsql;
```

Use this shared trigger helper from table files that maintain an `updated_at` column.

## Data API privileges (`anon`, `authenticated`, `service_role`)

### The one rule

**In `supabase/schemas/`, declare privileges with `GRANT` only. Never write a
`REVOKE` for a table, view, column, or schema. Functions are the single
exception and always need one.**

Everything below is why, and each claim was measured on this repo rather than
reasoned about. If you change any of it, re-measure.

### Why relations need no revoke

`supabase/schemas/00.default_privileges.sql` revokes the Supabase default ACL
for the migration owner, so **a relation created after it is born with
`relacl = NULL`, which is owner-only**. Its file therefore states its whole ACL
positively:

```sql
alter table public.projects enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.projects to authenticated,
service_role;
```

Verified: deleting the `revoke all privileges` block from a table file produced a
completely empty `supabase db diff`. It was doing nothing.

This also fails in the safe direction. Forget a `GRANT` and the relation is
unreachable, which breaks loudly on the first query. Under the old
revoke-then-grant convention, forgetting the `REVOKE` left the relation writable
by every signed-in user of every workspace, silently.

- **`authenticated`:** the Data API / browser. Omit verbs the client must not
  have (subscriptions are SELECT-only for `authenticated`; billing writes go
  through `service_role`).
- **`service_role`:** backend, edge functions, and e2e admin seeding. Grant
  SELECT, INSERT, UPDATE, and DELETE on every public table it must read or
  write. Never grant TRUNCATE, REFERENCES, or TRIGGER to anyone: RLS does not
  constrain TRUNCATE or REFERENCES.
- **`anon`:** only when there is a public route. Today that is SELECT on
  `dashboards`. Do not grant `anon` on anything else.

Each grant names its own table. Never write a blanket
`grant ... on all tables in schema public` in a schema file: it is evaluated once
when the file runs, so it silently misses every table added afterwards, and the
per-table declaration is what `db diff` reads to build the migration.
`20260818120000_grant_service_role_dml_on_public_tables.sql` is that statement
used correctly, as a one-time backfill inside a migration. That is a repair, not
a declaration.

Column-scoped grants work the same way. A new table has `attacl = NULL` on every
column, so declare only the allowed column list:

```sql
grant insert (workspace_id, user_id, event_name) on public.events to authenticated;
```

A column left out of a column-scoped grant cannot be written at all, which is
the point: it is how `usage_analytics_events` stops a caller backdating events.

Schemas are the same again. A new schema grants nothing to anybody, so write
only the grant:

```sql
create schema if not exists analytics;

grant usage on schema analytics to service_role;
```

### Why functions DO need a revoke

Postgres grants `EXECUTE` on every new function to `PUBLIC`, and **no
`alter default privileges` declaration can suppress that**. Measured: with the
function default revoked, in `public`, in a schema with the revoke declared, and
in a schema without it, the new function came out `proacl = NULL` every time, and
`NULL` means the built-in `EXECUTE TO PUBLIC` applies. `anon` could call it in
all three cases.

So a function is the one object class that cannot be denied by default, and
every function needs deny-then-allow in its own file:

```sql
revoke all on function public.util__thing (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant execute on function public.util__thing (uuid) to authenticated;
```

Grant `EXECUTE` only to the roles that actually invoke it. A trigger function
needs no grant at all: Postgres checks `EXECUTE` when the trigger is created, not
when it fires. A function named inside an RLS policy DOES need it, because a
policy expression is evaluated as the calling role.

`pnpm db:validate-privileges` prints every function in a managed schema that no
schema file revokes. Treat that list as a to-do, not as noise.

### What `supabase db diff` can and cannot see

Measured by putting one deliberate delta in `supabase/schemas/` and reading the
emitted SQL:

| Change                     | Does migra emit it? |
| -------------------------- | ------------------- |
| table `GRANT` added        | yes                 |
| table `GRANT` removed      | yes, as a `REVOKE`  |
| column privileges          | **no**              |
| schema privileges          | **no**              |
| view grants                | **no**              |
| `alter default privileges` | **no**              |

This matches Supabase's own
[known caveats](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
list. An empty diff is therefore necessary but **not** sufficient proof of
privilege parity.

You do not need to fix that by hand. `pnpm db:new-migration` runs
`scripts/db/reconcile-privileges` after the diff, which replays the declarations
from `supabase/schemas/` in a rolled-back transaction, compares the result with
the database, and appends whatever the migration still owes. It closes all four
blind spots, including a view whose ACL a `DROP VIEW` discarded.

### Declarations are positive; migrations are absolute

This is the distinction that causes the most confusion, so hold both halves at
once:

|                   | `supabase/schemas/`                  | `supabase/migrations/`            |
| ----------------- | ------------------------------------ | --------------------------------- |
| What it is        | desired state, declarative           | repair steps, procedural          |
| When it runs      | only inside `db diff`'s shadow build | on every real database, once      |
| Starting state    | the object was just created, private | unknown history, possibly mutated |
| So privileges are | `GRANT` only                         | `REVOKE ALL` then `GRANT`         |

A migration cannot assume the object starts private, and it cannot assume the
local delta is the remote delta. `pg_default_acl` proves the point: Supabase's
shipped default has changed over time, so one project's new tables arrive with
all seven privileges and another's with only TRUNCATE, REFERENCES, and TRIGGER. A
migration that revoked only the locally surplus bits would leave the other
project still granting the rest. This is why the reconcile step emits
`revoke all privileges ... from public, anon, authenticated, service_role`
followed by the exact grants, and why you should not "tidy" that into a smaller
delta.

`[db.migrations] schema_paths` is empty in this repo, which the Supabase CLI
treats as "every file under `supabase/schemas/` in lexicographic order". Those
files are read by `db diff`. They **never run** on `supabase db reset` or in CI.
Only `supabase/migrations/` reaches a migrations-built database.

### Verification

Two independent gates, both wired into `pnpm test:db`:

1. `supabase/tests/database/permissions/exact_data_api_grants.test.sql` compares
   the complete `(object, grantee, privilege_type, is_grantable)` set for
   `PUBLIC`, `anon`, `authenticated`, and `service_role` against a hand-written
   matrix, so missing privileges, surplus privileges, and unexpected grant
   options all fail. Read explicit column ACLs from `pg_attribute.attacl` with
   `aclexplode`; `information_schema.column_privileges` also expands
   table-level privileges onto every column and cannot prove explicit-column
   parity.
2. `pnpm db:validate-privileges` fails when a migrations-built database does not
   reproduce what `supabase/schemas/` declares. Point it at any environment with
   `--db-url <url>` to check staging or production for hand-made drift.

Do not edit an already-applied migration. Correct a historical ACL by fixing the
declarative state and running `pnpm db:new-migration`.

## Integrated Example

If you are adding a new `projects` table that uses a custom enum and later exposing an RPC to create a project:

1. Create the enum in a dedicated `00` file such as `00.enum.project_status.sql`.
2. Create the table in its own file such as `10.projects.sql`.
3. Put the `projects` table definition, indexes, constraints, triggers, RLS policies, table-specific helper functions, and Data API `GRANT`s in `10.projects.sql`. No `REVOKE` for the table; a `REVOKE` only for each helper function.
4. Create the RPC in a higher-numbered dedicated file such as `70.rpc_create_project.sql`.
5. After updating the declarative files, run `pnpm db:reset` and then `pnpm db:new-migration <name>`, which generates, de-noises, and completes the migration's ACL for you. Review it; do not hand-edit it.

## Workflow

### 1. Update Declarative Schema

Define the desired final state in `supabase/schemas/`.

- Create new numbered files when introducing new entities.
- Update the existing entity file when changing an existing table, datatype, or RPC.
- Choose the lowest prefix that preserves dependency order, and reuse an
  existing index when the new file has no dependency on its peers there.
- Do not place declarative schema anywhere else.

### 2. Generate Migration

Reset immediately before generating the migration. This guarantees the diff is
based only on the current branch's migration history rather than objects left
by another local branch:

```bash
pnpm db:reset
```

Then generate the migration without running any intervening database command:

```bash
pnpm db:new-migration <migration_name>
```

Use a descriptive migration name. `db:new-migration` does four things, and the
last two exist because `db diff` alone is not enough:

1. `supabase db diff -f <name>` for everything migra can see.
2. `strip-noop-view-recreations` removes the view drop/recreate churn migra
   proposes on every run.
3. `reconcile-privileges --append` adds the default, schema, column, and view
   privileges migra cannot see, including the grants a brand-new view needs.
4. `reconcile-privileges` re-checks and fails if any drift remains.

Steps 2 and 3 have no package script of their own on purpose. `db:new-migration`
is the only entry point that fixes a migration, so there is no way to run half of
it and end up with a migration that looks finished and is not.

Read the result, but do not hand-complete it. If the ACL is wrong, the fix
belongs in `supabase/schemas/` or in the reconcile script, not in the migration.

### 3. Roll Back by Editing Declarative State

To revert a schema change:

1. Update the relevant files in `supabase/schemas/` back to the intended state.
2. Run `pnpm db:reset` immediately before `pnpm db:new-migration <rollback_migration_name>`.
3. Review the generated migration carefully for unintended destructive changes.

## Storage (`storage.objects` and `storage.buckets`)

Storage is the one place where the "never write migrations by hand" rule is
inverted. `supabase db diff` cannot author storage changes correctly, and left
alone it actively destroys them. Follow all five rules below or policies get
silently dropped.

### Why storage is special

`db diff` compares the live database against `supabase/schemas/`. Storage
policies live in the `storage` schema, which nothing under `supabase/schemas/`
described. So every unrelated `db diff` run saw a set of policies present in
the database and absent from the desired state, and dutifully wrote a migration
to drop them.

In this repo that happened four separate times, removing 14 policies and
recreating none. The end state on any database built from migrations alone,
which is every remote environment, was a private `workspaces` bucket with no
policies on it at all. Local databases masked the damage because
`[db.seed] sql_paths` replayed the storage migrations afterwards.

### Rule 1: storage migrations are hand-written, and storage-only

Create the bucket and its policies in a migration you write yourself. Never
generate one for storage with `db diff -f`, except as a starting point you then
edit.

The file must contain storage statements and nothing else. No `public` tables,
no helper functions, no grants. A helper that a storage policy calls goes in
its own separate, non-storage migration ordered before it.

This is a hard requirement rather than tidiness: the file is re-executed
wholesale by the seed pass on an already-migrated database, so any non-storage
statement would run a second time, out of order.

### Rule 2: name it `{timestamp}_STORAGE-<description>.sql`

The `_STORAGE` prefix is the marker that the file is exclusively storage and is
therefore safe to replay. Anything without it must never appear in
`[db.seed] sql_paths`.

A migration that merely mentions storage in passing, such as one adding a
`public` helper used by a storage policy, does **not** get the prefix.

### Rule 3: every statement must be idempotent

```sql
insert into
  storage.buckets (id, name, public)
values
  ('my_bucket', 'my_bucket', false) on conflict (id) do nothing;

drop policy if exists "Users can SELECT my_bucket" on storage.objects;

create policy "Users can SELECT my_bucket" on storage.objects for
select
  to authenticated using (bucket_id = 'my_bucket');
```

Required, not stylistic. Files listed in `sql_paths` run a second time against
a database that already applied them as a migration. A bare `create policy`
there aborts `supabase db reset` with `SQLSTATE 42710`.

### Rule 4: list it in `[db.seed] sql_paths` in `supabase/config.toml`

The seed pass runs after the migration pass, making it the last word on storage
for a local database.

Two traps:

- **Order is significant, and it is not timestamp order.** Later entries
  overwrite policies created by earlier ones. A file that narrows an earlier
  file's policies must come after it.
- **A path matching no file is a WARNING, not an error.** A typo leaves a
  bucket with zero policies and the reset still reports success. This repo
  shipped exactly that bug: a hyphen where the filename had an underscore, so
  the `opendata` bucket had no policies for months.

Verify after any change:

```bash
psql "$DATABASE_URL" -c "select policyname from pg_policies
  where schemaname = 'storage' and tablename = 'objects' order by policyname;"
```

Only list files that satisfy Rule 3. A non-idempotent legacy migration stays
out of the list; supersede it with a later idempotent one instead of editing a
migration that production has already applied.

### Rule 5: mirror every policy into `supabase/schemas/99.storage.sql`

This is the rule that stops the bleeding. Declaring the policies in the
declarative schema makes `db diff` see them as intended, so it stops generating
drops.

The mirror holds `create policy` statements only:

- No `drop policy if exists`. Declarative files describe desired state.
- No bucket inserts. That is DML, which diff does not track anyway.

Number it `99`, not `100`. Schema files are applied in **lexicographic** order,
where `100.` sorts between `10.` and `15.` and would place the policies ahead
of the utility files defining the functions they call. Two digits also keeps it
consistent with the `NN.` rule above.

After adding the mirror, confirm the loop is closed:

```bash
supabase stop && PGSSLMODE=disable supabase db diff
```

Empty output means the schema matches and no future diff will drop the
policies. Any `drop policy` in that output means the mirror is out of sync with
the migrations.

### Checklist for a new bucket

1. Hand-write `{timestamp}_STORAGE-<name>-bucket.sql` with the bucket insert
   and its policies, every statement idempotent.
2. Add it to `[db.seed] sql_paths`, in the right position.
3. Add the same policies to `supabase/schemas/99.storage.sql`.
4. Run `supabase db reset`, then confirm the policy list in `pg_policies`.
5. Run `supabase db diff` and confirm it is empty.

## Known Caveats

`supabase db diff` and its underlying tooling do not reliably capture every
change. Privilege gaps are handled automatically by `pnpm db:new-migration`; see
[What `supabase db diff` can and cannot see](#what-supabase-db-diff-can-and-cannot-see)
for the measured table. For the rest, create a manual versioned migration when
needed instead of relying only on schema diff:

- DML statements such as `INSERT`, `UPDATE`, and `DELETE`
- view ownership, grants, and some view recreation cases
- materialized views
- `ALTER POLICY` statements
- column privileges
- schema privileges
- comments
- partitions
- `ALTER PUBLICATION ... ADD TABLE ...`
- `CREATE DOMAIN`
- some duplicated `GRANT` output from default privileges

For an ordinary schema change, still generate the migration first. Then remove
unintended view recreation and manually add only the omitted ACL statements.
Prove the final state with exact-set catalog tests; neither an empty diff nor a
positive-only `has_*_privilege` test can detect all dangerous surplus grants.

## What This Overrides

Do not use `supabase db pull --local --yes` as the main schema authoring workflow.

Use this workflow instead:

1. Define the desired schema in `supabase/schemas/*.sql`
2. Keep files small, numbered, and dependency-ordered
3. Run `pnpm db:reset`
4. Run `pnpm db:new-migration <migration_name>` immediately afterward
