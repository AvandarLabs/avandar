# Database tests (pgTAP)

Run after `supabase start` and `pnpm db:reset` so the schema matches migrations.

## Commands

- `pnpm test:db` - runs `supabase test db` against the local database.

Migration upgrade tests live in `supabase/migration-upgrade-tests/`, not here.
They are prelude/assertions fragments that only work concatenated around a
migration, so `supabase test db` would run them standalone and fail. See the
README there.

## Conventions

- Tests live under `supabase/tests/database/`, optionally grouped (e.g.
  `permissions/`).
- Every `.sql` file under `supabase/tests/` is globbed and run as a standalone
  pgTAP suite. Anything that cannot stand alone belongs outside this directory.
- Each file ends with `.test.sql`.
- Wrap tests in `begin; select plan(N); … select * from finish(); rollback;`.
- `00_setup_pgtap.test.sql` installs and asserts the pgTAP extension (runs first).
- Simulate a logged-in user with `set local role authenticated;` and
  `set local "request.jwt.claims" to '{"sub":"<uuid>"}';`.
- Seed data inside the same transaction so files stay isolated.

Only new permission features are covered here; legacy tables are unchanged.
