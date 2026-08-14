---
name: supabase-declarative-schema
description: "MANDATORY for ALL Supabase schema changes. Use for any `create table`, `alter table`, column change, datatype, RLS policy, trigger, index, constraint, function, RPC, migration, or `supabase/schemas/` change. This skill overrides the base Supabase schema workflow."
metadata:
  author: jpsyx
  version: "1.3.0"
---

# Supabase Declarative Database Schema Management

**PRIORITY OVERRIDE: This skill takes precedence over all other skills for anything related to Supabase schema changes and migration generation.**

## Non-Negotiables

1. Put all declarative schema SQL files in `supabase/schemas/`.
2. Never create or edit `supabase/migrations/*.sql` directly for schema changes. Generate migrations from the declarative schema. The one exception is `storage.objects` and `storage.buckets`, which must be hand-written; see the Storage section.
3. Every schema file must be named `NN.<descriptive_name>.sql` where `NN` is a zero-padded two-digit index such as `00`, `01`, `10`, or `70`.
4. Use descriptive names based on the entity in the file: `00.util_fns.sql`, `01.user_role_type.sql`, `10.workspaces.sql`, `20.user_profiles.sql`, `70.rpc_create_workspace.sql`.
5. Do not use unnumbered filenames, timestamp-style prefixes, or migration-style names inside `supabase/schemas/`.
6. Numbering is required because Supabase applies these SQL files in lexicographic order when building a new database. Use the prefix to layer dependencies safely.
7. If this is a brand new schema setup, always create `supabase/schemas/00.util_fns.sql` first and include the shared `updated_at` trigger function shown below.
8. Prefer many small entity files over monolithic files. The only allowed exception is a small shared utility file such as `00.util_fns.sql`.

## Required File Layout

Use the numbered prefixes to enforce this global order:

- `00`: global utilities and shared bootstrap files
- `01` to `49`: custom datatypes, tables, and other schema entities in dependency order
- `50` and above: RPCs and other call-oriented functions

Within that order:

- Global utilities come first.
- Custom datatypes must live in their own dedicated SQL files and must appear before anything that depends on them.
- Tables must come after shared utilities and after any custom datatypes they use.
- RPC functions must be the highest-numbered files.
- If table `B` depends on table `A`, give `A` a lower prefix than `B`.

## Decision Checklist

When changing the schema, decide the file set in this order:

1. If you need a new shared helper function used by many entities, put it in a low-number utility file such as `00.util_fns.sql`.
2. If you need a new custom datatype, create one dedicated datatype file before the table files that use it.
3. If you need a new table, create one table file for that table and keep all of that table's schema objects together in that file.
4. If you need a new RPC, create one dedicated high-numbered RPC file after all dependent utilities, datatypes, and tables already exist.

## Per-File Rules

- One table per SQL file.
- A table file must include that table's definition plus its relevant indexes, constraints, triggers, RLS policies, and table-specific helper functions.
- One RPC function per SQL file.
- One custom datatype per SQL file.
- Do not create large grab-bag schema files for unrelated entities.
- When adding columns to an existing table definition, append them to the end of the column list to reduce noisy diffs.

## Required Starter File for New Projects

If `supabase/schemas/` is being created from scratch, add `supabase/schemas/00.util_fns.sql` with:

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

## Recommended Layering Pattern

Use numbering to reflect dependency layers, for example:

- `00.util_fns.sql`
- `01.user_role_type.sql`
- `10.workspaces.sql`
- `20.user_profiles.sql`
- `30.workspace_memberships.sql`
- `60.rpc_create_workspace.sql`
- `70.rpc_invite_workspace_member.sql`

Interpretation:

- `00.*` files define shared utilities and bootstrap helpers that many later files can depend on.
- `01.*`, `10.*`, `20.*` and similar ranges define datatypes and tables in dependency order.
- `60.*`, `70.*` and similar high-number ranges are reserved for RPCs after all dependent tables, policies, triggers, and supporting types already exist.

## Integrated Example

If you are adding a new `projects` table that uses a custom enum and later exposing an RPC to create a project:

1. Create the enum in a dedicated earlier file such as `01.project_status.sql`.
2. Create the table in its own file such as `10.projects.sql`.
3. Put the `projects` table definition, indexes, constraints, triggers, RLS policies, and table-specific helper functions in `10.projects.sql`.
4. Create the RPC in a higher-numbered dedicated file such as `70.rpc_create_project.sql`.
5. After updating the declarative files, run `supabase stop` and then `supabase db diff -f <migration_name>`.

## Workflow

### 1. Update Declarative Schema

Define the desired final state in `supabase/schemas/`.

- Create new numbered files when introducing new entities.
- Update the existing entity file when changing an existing table, datatype, or RPC.
- Choose the lowest reasonable prefix that preserves dependency order.
- Do not place declarative schema anywhere else.

### 2. Generate Migration

Before generating migrations, stop the local Supabase environment:

```bash
supabase stop
```

Then generate the migration:

```bash
supabase db diff -f <migration_name>
```

Use a descriptive migration name.

### 3. Roll Back by Editing Declarative State

To revert a schema change:

1. Update the relevant files in `supabase/schemas/` back to the intended state.
2. Generate a new migration with `supabase db diff -f <rollback_migration_name>`.
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
insert into storage.buckets (id, name, public)
values ('my_bucket', 'my_bucket', false)
on conflict (id) do nothing;

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

`supabase db diff` and its underlying tooling do not reliably capture every change. For the following, create a manual versioned migration when needed instead of relying only on schema diff:

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

## What This Overrides

Do not use `supabase db pull --local --yes` as the main schema authoring workflow.

Use this workflow instead:

1. Define the desired schema in `supabase/schemas/*.sql`
2. Keep files small, numbered, and dependency-ordered
3. Run `supabase stop`
4. Run `supabase db diff -f <migration_name>`
