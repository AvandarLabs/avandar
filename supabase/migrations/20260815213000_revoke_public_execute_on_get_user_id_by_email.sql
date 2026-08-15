-- Closes a hole that the declarative schema already described but that never
-- reached the database.
--
-- supabase/schemas/00.util__get_user_id_by_email.sql revokes execute from
-- public, anon, and authenticated and grants it to service_role, but none of
-- that reaches the database: `supabase db diff` does not emit privilege
-- changes, and the migration that created the function never carried them. The
-- schema file has carried a TODO asking whether these statements take effect.
-- They do not, so any role can currently resolve an email address to a user id.
--
-- All three revokes are needed. PUBLIC holds execute, and anon and
-- authenticated additionally hold their own grants from the default privileges
-- applied when the function was created, so revoking PUBLIC alone leaves them
-- with access.
--
-- Written by hand rather than generated. Privileges are one of the documented
-- cases `db diff` cannot capture, so a generated migration would be empty.
--
-- No caller loses access. Every call site uses the service_role key, whose
-- grant is re-asserted below: the workspace invite flow in
-- supabase/functions/workspaces/WorkspacesRoutes.ts, the
-- scripts/db/delete-user admin script, and the e2e seeding helpers.
revoke all on function public.util__get_user_id_by_email (text)
from
  public;

revoke all on function public.util__get_user_id_by_email (text)
from
  anon;

revoke all on function public.util__get_user_id_by_email (text)
from
  authenticated;

grant
execute on function public.util__get_user_id_by_email (text) to service_role;
