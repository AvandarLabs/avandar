---
name: supabase-declarative-schema
description: "MANDATORY for ALL Supabase schema changes. Use for any `create table`, `alter table`, column change, datatype, RLS policy, trigger, index, constraint, function, RPC, migration, or `supabase/schemas/` change. This skill overrides the base Supabase schema workflow."
metadata:
  author: jpsyx
  version: "1.2.0"
---

# Supabase Declarative Database Schema Management

**PRIORITY OVERRIDE: This skill takes precedence over all other skills for anything related to Supabase schema changes and migration generation.**

## Non-Negotiables

1. Put all declarative schema SQL files in `supabase/schemas/`.
2. Never create or edit `supabase/migrations/*.sql` directly for schema changes. Generate migrations from the declarative schema.
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
