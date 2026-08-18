/**
 * Data API defaults: every new relation in `public` is born private.
 *
 * WHY THIS IS THE ONLY DENY STATEMENT FOR RELATIONS IN THIS DIRECTORY
 *
 * Supabase ships a default ACL that grants all seven table privileges to
 * `anon`, `authenticated`, and `service_role` on every relation created in
 * `public`:
 *
 *   pg_default_acl (role postgres, schema public, tables)
 *     anon=arwdDxt  authenticated=arwdDxt  service_role=arwdDxt
 *
 * `arwdDxt` is INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER.
 * The last three are reach, not paperwork: RLS does not apply to TRUNCATE, so
 * before this file existed `authenticated` could empty any public table, and
 * `anon` held TRUNCATE on all 29 of them while holding no SELECT on any.
 *
 * Postgres privileges are additive, so no `GRANT` in a table file can take
 * those bits back. Revoking the default inverts the rule once, for every
 * relation: a table or view created after this file has `relacl = NULL`, which
 * is owner-only. Its own schema file then states its entire ACL in positive
 * `GRANT`s and nothing else.
 *
 * That is also why this is the safer default for an agent or a hurried human.
 * Forgetting a `GRANT` makes a relation unreachable, and something breaks
 * immediately. Forgetting a `REVOKE`, which was the previous convention, left
 * a relation writable by every signed-in user of every workspace, silently.
 *
 * SEQUENCES
 *
 * There are no sequences in `public` today (no `serial` columns, no identity
 * columns), so the sequence default has no object to act on yet. It is
 * declared anyway because a default ACL has to be in place BEFORE the object
 * it governs exists. The day someone adds a `serial` column, the sequence
 * behind it must not arrive pre-granted `rwU` to `anon`; with this in place the
 * first insert fails loudly on a missing sequence grant instead.
 *
 * WHY FUNCTIONS ARE NOT HERE
 *
 * They cannot be. Postgres itself grants EXECUTE on every new function to
 * `PUBLIC`, and that built-in grant is not something `alter default
 * privileges` can suppress: revoking it here still yields `proacl = NULL` on
 * the new function, and `NULL` means the built-in default applies, so `anon`
 * can execute it. Measured directly, in all three of `public`, a schema with
 * the revoke declared, and a schema without it.
 *
 * Functions are therefore the one object class that genuinely needs
 * deny-then-allow in its own file, and every function in `supabase/schemas/`
 * has it. See the `supabase-declarative-schema` skill.
 *
 * THIS FILE IS INVISIBLE TO `supabase db diff`
 *
 * migra does not diff default privileges at all. Changing this file produces
 * no statement in a generated migration; that was measured by neutering it and
 * diffing. `pnpm db:new-migration` closes the gap by running
 * `scripts/db/reconcile-privileges` after the diff, which compares the
 * migration-built database against what this directory declares and appends
 * whatever the migration still owes. Do not hand-write the migration for a
 * change to this file, and do not assume an empty diff means this file landed.
 */
alter default privileges for role postgres in schema public
revoke all privileges on tables
from
  public,
  anon,
  authenticated,
  service_role;

alter default privileges for role postgres in schema public
revoke all privileges on sequences
from
  public,
  anon,
  authenticated,
  service_role;
