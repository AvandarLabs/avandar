# SQL rules

- Use the `supabase-postgres-best-practices` skill for query, schema, and
  performance guidance.

## Naming

- `snake_case` everywhere.
- Tables: plural (`profiles`, not `profile`).
- Functions: namespace-prefixed.
  - `util__*` for utilities.
  - `table_name__*` for table-specific (e.g. `profiles__get_active`).
- Triggers: `tr__table_name__*`.

## Row level security (RLS)

- Threat model: the browser holds the Supabase **publishable (anon) key**. Any
  authenticated user can hand-craft PostgREST calls (JSON, filters, verbs).
  RLS is the only authorization layer, not client code.
- Tie every sensitive column to the **workspace id on the row** (or a join
  resolving to it). Never trust a client-supplied workspace id unless bound
  to the tuple PostgREST is mutating.
- Helper functions take the workspace id **from the row expression**, not
  from the JWT or a client value.
  - Example: `util__can_manage_workspace_settings(public.user_roles.workspace_id)`.
- `UPDATE` policies must include `WITH CHECK` constraining the **new** row
  the same way as `USING` constrains the old row — otherwise users can
  rewrite a row into a workspace they don't own.

## Tests

- Database tests live in `supabase/tests/database/` and use pgTAP. See
  `supabase/tests/README.md` for how to run them.
- Reference examples:
  - `supabase/tests/database/permissions/rls_phase3_policies.test.sql` — full
    multi-user RLS scenario (owner, viewer, editor in one workspace).
  - `supabase/tests/database/permissions/rls_datasets_dashboards_manager_writes.test.sql`
    — write-path RLS (`INSERT`/`UPDATE`/`DELETE`) checks.
  - `supabase/tests/database/permissions/util_resource_effective_role.test.sql`
    — testing a helper function used by policies.
- **RLS policies must always be tested.** Asserting the happy path
  (allowed user can read their row) is not enough. For every policy, also
  assert the **negative** cases:
  - A user outside the workspace **cannot** `SELECT` the row.
  - A user outside the workspace **cannot** `INSERT` a row claiming that
    workspace id (covers `WITH CHECK` on inserts).
  - A user outside the workspace **cannot** `UPDATE` the row, **and** an
    in-workspace user cannot `UPDATE` the row to move it into another
    workspace (covers `WITH CHECK` on updates).
  - A user outside the workspace **cannot** `DELETE` the row.
  - Lower-privileged in-workspace roles cannot perform actions reserved for
    higher roles (e.g. viewer cannot write).
- Test against rows the current user should **not** see, not just rows they
  should. A policy that silently returns zero rows for unauthorized reads
  is correct; a policy that lets an unauthorized write succeed is a breach.
