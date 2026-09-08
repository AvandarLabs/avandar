/**
 * Data API defaults: every new relation in `public` is born private.
 *
 * Supabase ships a default ACL granting all seven table privileges to `anon`,
 * `authenticated`, and `service_role` on every relation created in `public`.
 * The last three of those (TRUNCATE, REFERENCES, TRIGGER) are reach, not
 * paperwork: RLS does not apply to TRUNCATE, so before this file existed
 * `anon` could empty any public table while holding SELECT on none of them.
 *
 * Postgres privileges are additive, so no `GRANT` in a table file can take
 * those bits back. Revoking the default inverts the rule once, for every
 * relation: anything created after this file is owner-only, and its own
 * schema file then states its entire ACL in positive `GRANT`s. That also
 * fails in the safe direction. A missing `GRANT` makes a relation unreachable
 * and breaks immediately; a missing `REVOKE` left a relation writable by every
 * signed-in user of every workspace, silently.
 *
 * The sequence default has no object to act on yet, because `public` has no
 * `serial` or identity columns. It is declared anyway because a default ACL
 * has to be in place BEFORE the object it governs exists: the day someone adds
 * a `serial` column, the sequence behind it must not arrive pre-granted to
 * `anon`.
 *
 * Functions cannot be covered here. Postgres itself grants EXECUTE on every
 * new function to `PUBLIC`, and `alter default privileges` cannot suppress
 * that built-in grant: revoking it still yields `proacl = NULL`, which means
 * the built-in default applies. Functions therefore need deny-then-allow in
 * their own file, and every function in `supabase/schemas/` has it. See the
 * `supabase-declarative-schema` skill.
 *
 * Note: `supabase db diff` cannot see this file, because migra does not diff
 * default privileges. `pnpm db:new-migration` closes the gap by running
 * `scripts/db/reconcile-privileges` after the diff, which compares the
 * migration-built database against what this directory declares and appends
 * whatever the migration still owes. Do not hand-write the migration for a
 * change here, and do not read an empty diff as proof this file landed.
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
