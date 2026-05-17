# SQLite migrations (generated)

These files are **generated** from `supabase/migrations/*.sql` by
`pnpm gen:sqlite-migrations`. Do not edit by hand. Edit the corresponding
Postgres migration instead, then regenerate.

## Prerequisites (developer machine only)

- Python 3.10+
- `sqlglot` >= 22

```bash
pip install --user 'sqlglot>=22'
```

`sqlglot` is **not** an npm dependency and is **not** bundled into the web
or desktop runtime. It is only invoked by
`apps/desktop/scripts/gen-sqlite-migrations.ts` via `python3 -m sqlglot`
when a developer (or CI) regenerates this directory.

## Regenerate

```bash
pnpm gen:sqlite-migrations
```

Reads every `supabase/migrations/*.sql`, partitions each statement using
`apps/desktop/sync/syncable-tables.ts`, transpiles the kept statements to
SQLite via sqlglot, and writes the result to this directory. Hard-errors
when a statement touches a table that is not in either `SYNCABLE_TABLES`
or `EXCLUDED_TABLES`; in that case categorise the table in the manifest
and re-run.

## Check for drift (CI)

```bash
pnpm check:sqlite-migrations
```

Regenerates to a temp directory and diffs against the committed files.
Non-zero exit on drift; intended for CI so a Postgres migration cannot
land without a matching SQLite update.

## Adding a new table

1. Author the Postgres migration as usual (`pnpm db:new-migration name`).
2. Decide: should this table be synced to desktop?
   - Yes -> add to `SYNCABLE_TABLES` in
     `apps/desktop/sync/syncable-tables.ts`.
   - No -> add to `EXCLUDED_TABLES`.
3. Run `pnpm gen:sqlite-migrations`.
4. Commit the regenerated `apps/desktop/migrations/*.sql` files alongside
   the Postgres migration.
