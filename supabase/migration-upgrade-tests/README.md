# Migration upgrade tests

These verify that a migration **preserves existing data** when it runs against
a database shaped the way production is shaped *before* the migration. That is
a different question from the one `pnpm db:reset` answers, which is only
whether migrations apply cleanly to an empty database.

Run by `scripts/test-dashboard-publishing-migrations.sh`, which is the second
half of `pnpm test:db`.

## Why they are not under `supabase/tests/`

`supabase test db` globs every `.sql` under `supabase/tests/` and runs each file
as a standalone pgTAP suite. The files here are fragments that are meaningless
alone, so being globbed made the suite report `FAIL` on a healthy branch:

- a `.prelude.sql` opens a transaction and never commits, so run alone it does
  nothing and reports zero tests;
- an `.assertions.sql` then runs in a *separate* psql process against the
  normal migrated database, where the prelude's fixtures do not exist, so its
  assertions fire against empty rows.

Keeping them outside `supabase/tests/` is what makes the pgTAP suite honest.
Do not move them back.

## The contract

Each scenario is three pieces concatenated into **one** psql invocation:

```
<name>.prelude.sql  →  supabase/migrations/<the migration>.sql  →  <name>.assertions.sql
```

- **prelude** opens `begin;`, tears down the modern shape, rebuilds the
  pre-migration shape, and seeds representative rows. It must not commit.
- **the migration** is referenced by exact path from the runner script. This is
  why the migrations it covers cannot be merged into a combined file: a
  migration that cannot be applied in isolation cannot be replayed.
- **assertions** is a `do $$ … $$;` block that raises on any unmet expectation,
  then `rollback;` so the database is left untouched.

Because the runner uses `set -euo pipefail` and `ON_ERROR_STOP=on`, any raised
exception fails the run.

## Adding a scenario

1. Write `<name>.prelude.sql` and `<name>.assertions.sql` here.
2. Add a `run_migration_replay` call to
   `scripts/test-dashboard-publishing-migrations.sh` naming the migration.
3. Assert on the data the migration backfills, not on schema shape alone.
   Schema shape is already covered by `pnpm db:reset` plus the pgTAP suites in
   `supabase/tests/database/`.
