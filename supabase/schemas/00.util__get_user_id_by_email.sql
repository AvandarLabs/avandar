-- Auth function to get a user id by email
-- @returns uuid
create or replace function public.util__get_user_id_by_email (
  p_email text
) returns uuid as $$
declare
  v_result uuid;
begin
  select u.id into v_result
    from auth.users as u
    where lower(u.email) = lower(p_email)
    limit 1;
  return v_result;
end;
$$ language plpgsql security definer
set
  search_path = auth,
  pg_temp;

-- Do not allow public calls to `auth.get_user_id_by_email`.
--
-- `supabase db diff` does not emit privilege changes, so these statements do
-- not reach the database on their own. The revokes below are applied by
-- 20260815213000_revoke_public_execute_on_get_user_id_by_email.sql and the
-- migration that created the function. Any future change here needs a
-- hand-written migration to match.
revoke all on function public.util__get_user_id_by_email (text)
from
  public;

revoke all on function public.util__get_user_id_by_email (text)
from
  anon;

revoke all on function public.util__get_user_id_by_email (text)
from
  authenticated;

-- Only allow calls from the service role
grant
execute on function public.util__get_user_id_by_email (text) to service_role;
