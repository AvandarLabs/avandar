# SQLite migrations (generated, with hand-edits)

These files are **generated** from `supabase/migrations/*.sql` by
`pnpm gen:sqlite-migrations`. The generator captures schema-shape
changes only (CREATE/ALTER/DROP TABLE, CREATE/DROP INDEX); RLS
policies, functions, triggers, GRANTs, COMMENTs, type definitions, and
data-mutation statements (UPDATE/INSERT/DELETE/DO blocks) are silently
dropped because SQLite has no equivalent for them.

## 1-to-1 with Postgres migrations

Every file in `supabase/migrations/*.sql` produces exactly one
`apps/desktop/migrations/<same-stem>.gen.sql`. Migrations that contain
no schema-shape statements (pure RLS / function / data backfill) still
get a `.gen.sql` with a header summary and a "no schema-shape changes"
comment instead of being silently skipped, so reviewers can confirm
every Postgres migration was processed and see at a glance what was
emitted, dropped, or queued for hand-edit. The header looks like:

```sql
-- Generated from supabase/migrations/<source>.sql by
-- apps/desktop/scripts/gen-sqlite-migrations.ts. Do not edit by hand
-- unless the matching `needs hand-edit` warning calls for it.
-- Schema-shape statements emitted: N
-- Statements dropped (RLS/funcs/triggers/data/etc.): M
-- Statements needing hand-edit (ADD CONSTRAINT, ALTER COLUMN): K
```

Some Postgres constructs **cannot** be auto-transpiled because SQLite's
`ALTER TABLE` only supports `RENAME` / `ADD COLUMN` / `DROP COLUMN`.
When the generator hits one of these, it drops the statement from the
generated output and prints a yellow `⚠ needs hand-edit` warning at the
end of the run. The cases:

- `ALTER TABLE ... ADD CONSTRAINT ...` (FK, CHECK, PRIMARY KEY, UNIQUE)
  - Inline into the matching `CREATE TABLE` in the earlier `.gen.sql`.
- `ALTER TABLE ... ALTER COLUMN ...` (change type, SET/DROP DEFAULT,
  SET/DROP NOT NULL)
  - Inline the new column shape into the CREATE TABLE in the earlier
    `.gen.sql`, then delete the original column definition there.

Once you hand-edit a `.gen.sql`, re-running `pnpm gen:sqlite-migrations`
will overwrite your changes. Treat the per-migration files as
generator output you have curated; commit them alongside the matching
Postgres migration the same way Alembic projects commit auto-generated
revisions a developer has tweaked.

## Foreign keys

SQLite enforces foreign keys natively when `PRAGMA foreign_keys = ON;`
is set (Phase 2 Task 7's runner sets this at connection open). The
generator preserves every FK whose target table is in
`SYNCABLE_TABLES`:

- **FK declared inline** in `CREATE TABLE` (column-level `REFERENCES`
  or table-level `FOREIGN KEY (...) REFERENCES ...`) -> emitted
  verbatim, SQLite handles it.
- **FK declared as a separate `ALTER TABLE ... ADD CONSTRAINT ...
  FOREIGN KEY`** -> SQLite cannot accept this syntax; routed to the
  `⚠ needs hand-edit` warning. Inline it into the CREATE TABLE
  yourself.
- **FK targeting a non-public schema** (e.g. `references auth.users`)
  -> dropped. The target table does not exist in the SQLite mirror.
- **FK targeting an `EXCLUDED_TABLES` entry** -> dropped, same reason.

## Prerequisites (developer machine only)

Just one tool: [`uv`](https://astral.sh/uv). It manages the Python
interpreter and the `sqlglot` package on demand, so you do not need to
think about Python versions, `pip`, virtualenvs, or PEP 668.

Install:

```bash
# macOS / Linux
brew install uv
#   or
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Confirm:

```bash
uv --version
```

`sqlglot` is **not** an npm dependency and is **not** bundled into the
web or desktop runtime. It is only resolved by uv when
`apps/desktop/scripts/gen-sqlite-migrations.ts` shells out via
`uv run --with 'sqlglot>=26.0.0,<27.0.0' python -c "..."`. uv caches the
package after first run; subsequent regenerations are fast.

The exact sqlglot version range lives in one place, the `SQLGLOT_SPEC`
constant at the top of `apps/desktop/scripts/gen-sqlite-migrations.ts`.
Bump it there.

## Verify your setup

Three checks, fastest first. The unit tests are hermetic (no Python
needed); the last two actually shell out to uv + sqlglot.

1. **The TypeScript-only logic passes its unit tests (no uv needed):**
   ```bash
   pnpm --filter @avandar/desktop test scripts/gen-sqlite-migrations.test.ts sync/syncable-tables.test.ts
   ```
   Expected: green; covers the classifier, the partition logic, and the
   syncable-tables manifest shape.

2. **uv can resolve sqlglot and run a smoke transpile (does not touch
   the repo):**
   ```bash
   echo "create table foo (id uuid primary key, created_at timestamptz);" \
     | uv run --quiet --with 'sqlglot>=26.0.0,<27.0.0' python -c "import sys, sqlglot; print(sqlglot.transpile(sys.stdin.read(), read='postgres', write='sqlite')[0])"
   ```
   Expected: prints a SQLite-flavoured `CREATE TABLE`. First run takes
   a few seconds while uv downloads sqlglot into its cache; later runs
   are instant.

3. **End-to-end run of the generator against the real migrations
   (writes files into this directory):**
   ```bash
   pnpm gen:sqlite-migrations
   ```
   Expected: a log line like
   `[gen-sqlite-migrations] wrote N files; included X statements, skipped Y`,
   followed (if applicable) by a yellow `⚠ needs hand-edit` warning
   listing FKs / ALTER COLUMNs you need to inline by hand into the
   appropriate `.gen.sql` file.

   If the script hard-errors with
   `... has N unhandled statement(s)`, that means either:
   - A leading keyword the classifier does not recognise yet -> extend
     `classifyStatement()` in `apps/desktop/scripts/gen-sqlite-migrations.ts`.
   - A table that is not categorised -> add it to either
     `SYNCABLE_TABLES` or `EXCLUDED_TABLES` in
     `apps/desktop/sync/syncable-tables.ts`.

   Then re-run.

## Regenerate

```bash
pnpm gen:sqlite-migrations
```

Reads every `supabase/migrations/*.sql`, classifies each statement,
transpiles the schema-shape kept ones to SQLite via sqlglot, and writes
the result to this directory. Prints a hand-edit warning summary at the
end for the statements SQLite cannot accept as written.

## Check for drift (CI)

```bash
pnpm check:sqlite-migrations
```

Regenerates to a temp directory and diffs against the committed files.
Non-zero exit on drift; intended for CI so a Postgres migration cannot
land without a matching SQLite update.

> Note: because some `.gen.sql` files are hand-edited after generation,
> the drift check will fail on those files even when nothing changed
> upstream. Until a "preserve hand-edits across regen" mechanism is in
> place, run the drift check only on a freshly regenerated tree, and
> treat the diff between fresh-gen and committed as the manual-edit
> ledger to keep in sync.

## Adding a new table

1. Author the Postgres migration as usual (`pnpm db:new-migration name`).
2. Decide: should this table be synced to desktop?
   - Yes -> add to `SYNCABLE_TABLES` in
     `apps/desktop/sync/syncable-tables.ts`.
   - No -> add to `EXCLUDED_TABLES`.
3. Run `pnpm gen:sqlite-migrations`.
4. Apply any hand-edits flagged by the warning (inline FKs, fold
   `ALTER COLUMN` into the CREATE TABLE).
5. Commit the regenerated + hand-edited `apps/desktop/migrations/*.gen.sql`
   files alongside the Postgres migration.
