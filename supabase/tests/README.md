# Database tests (pgTAP)

Run after `supabase start` and `pnpm db:reset` so the schema matches migrations.

## Commands

- `pnpm test:db` - runs `supabase test db` against the local database.

## Conventions

- Tests live under `supabase/tests/database/`, optionally grouped (e.g.
  `permissions/`).
- Each file ends with `.test.sql`.
- Wrap tests in `begin; select plan(N); … select * from finish(); rollback;`.
- `00_setup_pgtap.test.sql` installs and asserts the pgTAP extension (runs first).
- Simulate a logged-in user with `set local role authenticated;` and
  `set local "request.jwt.claims" to '{"sub":"<uuid>"}';`.
- Seed data inside the same transaction so files stay isolated.

Only new permission features are covered here; legacy tables are unchanged.
